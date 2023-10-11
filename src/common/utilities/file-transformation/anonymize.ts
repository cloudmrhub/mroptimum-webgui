export const anonymizeTWIX = async (file: any) => {
    console.log('Here : ', file);
    const file_bytes = await file.slice(0, 11244).arrayBuffer();
    console.log(file_bytes);

    const bytes_reader = file_reader(file_bytes);
    let preamble = new Uint8Array(file_bytes); // Interpret as a bunch of ints
    let num_scans = 1;
    let file_format;
    const measOffset = [];
    const measLength = [];

    const int1 = bytes_reader.read_u32();
    const int2 = bytes_reader.read_u32();

    let VDHeaderPatientInfoViews = [];

    if (int1 < 10000 && int2 <= 64) {
        // Looks like a VD format
        file_format = 'VD';
        let num_scans = int2; // The number of measurements in this file
        const measID = bytes_reader.read_u32(); // Unused, but this is where they are
        const fileID = bytes_reader.read_u32();

        for (let i = 0; i < num_scans; i++) {
            measOffset.push(Number(bytes_reader.read_u64())); // Where the header of the first measurement starts
            measLength.push(Number(bytes_reader.read_u64())); // nominally the length of the measurement
            VDHeaderPatientInfoViews.push(preamble.subarray(bytes_reader.position(), bytes_reader.advance(64)));
            bytes_reader.advance(64);
            bytes_reader.advance(8);
        }
    } else {
        file_format = 'VB';
        measOffset.push(0); // There's only one measurement in VB files, so it starts at 0.
    }

    console.log(`${file_format} file, ${num_scans} scan(s).`);
    let found_pii = new Set();

    if (file_format == 'VD') {
        // VD seems to store patient info in here...
        for (let i = 0; i < num_scans; i++) {
            const patient_info = VDHeaderPatientInfoViews[i];
            const len = patient_info.indexOf(0);
            if (len > 3) {
                const patient_info_string = utf8_decode(patient_info.subarray(0, patient_info.indexOf(0)));
                const patient_info_pieces = patient_info_string.split(',');

                for (const piece of patient_info_pieces) {
                    if (piece.length > 3) {
                        found_pii.add(piece);
                    }
                }

                found_pii.add(patient_info_string);
            }

            patient_info.fill(0);
            patient_info.fill(char('X'), 0, 16);
        }
    }

    const headers = [];
    let data_slices = [];

    for (let i = 0; i < num_scans; i++) {
        console.log(`Scan ${i + 1}.`);
        const header_len = new Uint32Array(await file.slice(measOffset[i], measOffset[i] + 4).arrayBuffer())[0];
        const header = new Uint8Array(await file.slice(measOffset[i], measOffset[i] + header_len).arrayBuffer());
        const scan_text_header = header.subarray(19, header_len);
        console.log(utf8_decode(scan_text_header).slice(-150));
        console.log(`Header length: ${header_len}`);
        const new_found_values: any = anonymize_header(scan_text_header);

        for (const value of new_found_values) {
            found_pii.add(value);
        }

        headers.push(header);

        if (i < num_scans - 1) {
            data_slices.push(file.slice(measOffset[i] + header_len, measOffset[i + 1]));
        } else {
            data_slices.push(file.slice(measOffset[i] + header_len, file.size));
        }
    }

    preamble = preamble.slice(0, measOffset[0]); // this ends up empty in VB
    verify_anonymous(preamble, found_pii);

    for (const header of headers) {
        verify_anonymous(header, found_pii); // double check by scanning for patient info bytes
    }

    let file_pieces = [preamble];

    for (let i = 0; i < num_scans; i++) {
        file_pieces.push(headers[i]);
        file_pieces.push(data_slices[i]);
    }

    const anonym_file = new File(file_pieces, file.name);

    if (anonym_file.size != file.size) {
        throw new Error('File size mismatch.');
    }

    console.log(file_pieces);
    return anonym_file;
};

const file_reader = (b: any) => {
    let bytes = b;
    let k = 0;

    return {
        position: () => {
            return k;
        },
        seek: (x: any) => {
            k = x;
            return k;
        },
        read_bytes: (n: any) => {
            k += n;
            return new Uint8Array(bytes.slice(k - n, k));
        },
        read_u32: () => {
            k += 4;
            return new Uint32Array(bytes.slice(k - 4, k))[0];
        },
        read_u64: () => {
            k += 8;
            return new BigInt64Array(bytes.slice(k - 8, k))[0];
        },
        advance: (x: any) => {
            k += x;
            return k;
        },
    };
};

const anonymize_header = (data: any) => {
    const patient_names: any = anonymizeByTag(
        data,
        ['PatientName', 'PatientsName', 'tPatientName', 'tPatientsName'],
        replace_X,
    );

    if (!patient_names) {
        return new Set();
    }

    if (patient_names.size == 0) {
        throw new Error('Anonymization failed: unable to detect patient name');
    }

    const patient_id: any = anonymizeByTag(data, 'PatientID', replace_ID);
    const patient_bday: any = anonymizeByTag(data, 'PatientBirthDay', replace_bday);
    const physician: any = anonymizeByTag(data, 'tPerfPhysiciansName', replace_X);
    return new Set([...patient_names, ...patient_id, ...patient_bday, ...physician]);
};

const anonymizeByTag = (data: any, tagNames: any, do_replace: any) => {
    let found_at = 0;
    let old_found_at = found_at;
    let n = 0;
    let old_value;
    let old_values = new Set();

    if (!Array.isArray(tagNames)) {
        tagNames = [tagNames];
    }

    console.log('anonymizeByTag', tagNames);

    for (let tag of tagNames) {
        do {
            old_found_at = found_at;
            [found_at, old_value] = processTagOnce(data, tag, do_replace, found_at + 1);

            if (found_at > 0 && old_found_at > found_at) {
                throw new Error('Infinite loop detected');
            }

            if (old_value != null) {
                old_values.add(old_value);
                console.log(`old value ${old_value} at ${found_at}`);
            }

            n++;
        } while (found_at > -1 && n < 15);

        if (n >= 15) {
            throw new Error('Infinite loop detected');
        }
    }

    return old_values;
};

// Scan forward until it matches a tag we're obscuring, and obscure it
// Returns the end of the matched tag
const processTagOnce = (data: any, tagName: any, do_replace: any, start = 0) => {
    console.log('processTagOnce', tagName, do_replace);
    const loc = find_tag(data, 'ParamString."' + tagName + '"', start);
    console.log('find_tag ==', loc);

    if (loc == -1) return [-1, null];

    // Find the braces that surround the tag contents
    const braces_begin = data.indexOf(char('{'), loc) + 1;
    const braces_end = data.indexOf(char('}'), loc);

    // looks like } {
    if (braces_begin > braces_end) {
        throw new Error(`Invalid tag detected: mismatched braces (looks like } { })`);
    }

    const tag_contents = data.subarray(braces_begin, braces_end);

    // Find the last quoted thing in the subarray...
    const val_end = tag_contents.lastIndexOf(char('"'));

    if (val_end == -1) return [braces_end, null]; // oh, it's just empty, never mind

    const val_begin = tag_contents.lastIndexOf(char('"'), val_end - 1) + 1;

    if (val_begin == -1) throw new Error('Invalid tag detected: missing opening quote'); // Can't find the opening quote

    const tag_value = tag_contents.subarray(val_begin, val_end);
    const old_tag_value = utf8_decode(tag_value.slice());
    do_replace(tag_value);

    return [braces_end + 1, old_tag_value];
};

const find_tag = (data: any, name: any, start: any) => {
    console.log('find_tag', name, start);
    let s = start || 0;
    let did_recover = false;
    let tag_begin;

    do {
        tag_begin = data.indexOf(char('<'), s);
        if (tag_begin == -1) return -1;

        const tag_end = data.indexOf(char('>'), tag_begin + 1);

        if (tag_end == -1) {
            console.log(`Warning: unclosed tag`, utf8_decode(data.subarray(tag_begin)));

            if (data.length - tag_begin > 40) {
                throw new Error('unclosed tag');
            }

            return -1;
        }

        const tag_begin_check = data.indexOf(char('<'), tag_begin + 1);

        if (tag_begin_check > -1 && tag_begin_check < tag_end) {
            console.log(
                `Warning: invalid tag begin at ${tag_begin}, recovering.`,
                utf8_decode(data.subarray(tag_begin, tag_end + 1)),
            );

            s = tag_begin + 1;
            did_recover = true;
            continue;
        }

        const tag_value = utf8_decode(data.slice(tag_begin + 1, tag_end));

        if (did_recover) {
            console.log(tag_value);
            did_recover = false;
        }

        s = tag_end + 1;

        if (tag_value == name) {
            return tag_end;
        }
    } while (tag_begin != -1);

    return -1;
};

const verify_anonymous = (data: any, tags: any) => {
    console.log('checking for', tags);

    for (let i = 0; i < data.length; i++) {
        for (let tag_value of tags) {
            if (utf8_decode(data.slice(i, i + tag_value.length)) == tag_value) {
                console.log('Anonymization failed at location', i);
                console.log(utf8_decode(data.slice(Math.max(i - 50, 0), i + tag_value.length + 10)));
                throw new Error('anonymization failed');
            }
        }
    }
};

const utf8_decode = (t: any) => {
    return new TextDecoder('utf-8').decode(t);
};

const utf8_encode = (t: any) => {
    return new TextEncoder().encode(t);
};

const replace_ID = (tag_value: any) => {
    return tag_value.fill(char('0'));
};

const replace_X = (tag_value: any) => {
    return tag_value.fill(char('X'));
};

const replace_bday = (tag_value: any) => {
    tag_value.fill(char(' '));
    tag_value.set(utf8_encode('19700101'));
    return tag_value;
};

const char = (c: any) => {
    return c.charCodeAt(0);
};

const arrays_equal = (dv1: any, dv2: any) => {
    if (dv1.length != dv2.length) return false;

    for (let i = 0; i < dv1.length; i++) {
        if (dv1[i] != dv2[i]) return false;
    }

    return true;
};
