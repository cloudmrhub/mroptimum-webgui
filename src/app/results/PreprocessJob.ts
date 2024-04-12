import JSZip from "jszip";
import axios from "axios";
import {SNR} from "../../features/setup/setupSlice";
import {LogItem} from "../../features/jobs/jobsSlice";



interface InfoInterface{
    headers:{
        calculation_time:number;
        options: SNR & {
            token: string,
            pipelineid?: string;
        };
        logs: LogItem[],
    },
    data: any[],
    info: {
        calculation_time: number,
        slices: number
    }
}

export async function processJobZip(file:File,fileName:string, token:string){
    let jszip = new JSZip();
    // Create a new JSZip instance for the output zip
    let outputZip = new JSZip();

    try {
        const zip = await jszip.loadAsync(file instanceof Blob ? file : new Blob([file]));
        let infoFound = false;

        for (const [filename, zipEntry] of Object.entries(zip.files)) {
            console.log(filename);
            if (filename === 'info.json') {
                // Process info.json
                const fileContent = await zipEntry.async('string');
                let infoJSON = <InfoInterface>JSON.parse(fileContent);
                if (!infoJSON.headers) return undefined;
                delete infoJSON.headers.options.pipelineid;
                infoJSON.headers.options.token = `Bearer ${token}`;
                console.log(infoJSON);
                // Add modified info.json to outputZip
                outputZip.file(filename, JSON.stringify(infoJSON, null, 2));
                infoFound = true;
            } else {
                // Add unmodified files to outputZip
                const blobContent = await zipEntry.async('blob');
                outputZip.file(filename, blobContent);
            }
        }

        if (!infoFound) return undefined;

        // Generate the updated zip as a Blob
        const content = await outputZip.generateAsync({type: "blob"},);
        console.log(content.type);
        return  new File([content], fileName,{
            type: content.type,
            lastModified: Date.now()
        }); // This Blob can be used for downloading or further processing

    } catch (error) {
        console.error("There was an error processing the zip file:", error);
        return undefined;
    }
}