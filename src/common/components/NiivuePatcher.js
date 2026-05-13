/**
 * This file patches the original NiiVue library to produce customized behaviors and effects.
 */
import { Niivue, NVImage, NVImageFromUrlOptions } from "@niivue/niivue";
import { nv } from "./Niivue";

/*
 * bitmapOverlay — in-browser state only: remembers each voxel's label *before* Group
 * (so Ungroup can restore red/green etc.). It is not written to NIfTI; closing the tab
 * or loading a new drawing loses it unless the file already stores separate label ids.
 *
 * When to drop that saved state (so it cannot go stale):
 * - Full reset: replace whole drawing, clear/close drawing, delete-by-label,
 *   load from URL/base64, relabel → clear the entire array.
 * - Merge upload: remove entries only for voxels the import overwrites (non-zero in
 *   the imported map); other voxels keep their saved pre-merge labels for Ungroup.
 */
const bitmapOverlay = [];

function clearBitmapOverlay() {
    bitmapOverlay.length = 0;
}

/** Remove group-undo rows for voxels that will be / were overwritten by an import (flat indices). */
function stripBitmapOverlayForVoxelIndices(writtenSet) {
    if (!writtenSet || writtenSet.size === 0) {
        return;
    }
    for (let k = bitmapOverlay.length - 1; k >= 0; k--) {
        if (writtenSet.has(bitmapOverlay[k][0])) {
            bitmapOverlay.splice(k, 1);
        }
    }
}

/** Clone of drawBitmap with bitmapOverlay undo applied; does not mutate the live drawing. */
function getResolvedDrawBitmapForExport(nv) {
    const src = nv.drawBitmap;
    const copy = new Uint8Array(src);
    for (let i = 0; i < bitmapOverlay.length; i++) {
        const t = bitmapOverlay[i];
        copy[t[0]] = t[1];
    }
    return copy;
}

var NiivueObject3D = function (id, vertexBuffer, mode, indexCount, indexBuffer = null, vao = null) {
    this.BLEND = 1;
    this.CULL_FACE = 2;
    this.CULL_FRONT = 4;
    this.CULL_BACK = 8;
    this.ENABLE_DEPTH_TEST = 16;
    this.sphereIdx = [];
    this.sphereVtx = [];
    this.renderShaders = [];
    this.isVisible = true;
    this.isPickable = true;
    this.vertexBuffer = vertexBuffer;
    this.indexCount = indexCount;
    this.indexBuffer = indexBuffer;
    this.vao = vao;
    this.mode = mode;
    this.glFlags = 0;
    this.id = id;
    this.colorId = [
        ((id >> 0) & 255) / 255,
        ((id >> 8) & 255) / 255,
        ((id >> 16) & 255) / 255,
        ((id >> 24) & 255) / 255
    ];
    this.modelMatrix = create2();
    this.scale = [1, 1, 1];
    this.position = [0, 0, 0];
    this.rotation = [0, 0, 0];
    this.rotationRadians = 0;
    this.extentsMin = [];
    this.extentsMax = [];
};


function create2() {
    var out = new Float32Array(16);
    out[0] = 1;
    out[5] = 1;
    out[10] = 1;
    out[15] = 1;
    return out;
}

function decodeRLE(rle, decodedlen) {
    const r = new Uint8Array(rle.buffer)
    const rI = new Int8Array(r.buffer) // typecast as header can be negative
    let rp = 0 // input position in rle array
    // d: output uncompressed data array
    const d = new Uint8Array(decodedlen)
    let dp = 0 // output position in decoded array
    while (rp < r.length) {
        // read header
        const hdr = rI[rp]
        rp++
        if (hdr < 0) {
            // write run
            const v = rI[rp]
            rp++
            for (let i = 0; i < 1 - hdr; i++) {
                d[dp] = v
                dp++
            }
        } else {
            // write literal
            for (let i = 0; i < hdr + 1; i++) {
                d[dp] = rI[rp]
                rp++
                dp++
            }
        }
    }
    return d
}

function intensityRaw2Scaled(hdr, raw) {
    if (hdr.scl_slope === 0) {
        hdr.scl_slope = 1.0
    }
    return raw * hdr.scl_slope + hdr.scl_inter
}

const SLICE_TYPE = Object.freeze({
    AXIAL: 0,
    CORONAL: 1,
    SAGITTAL: 2,
    MULTIPLANAR: 3,
    RENDER: 4,
});

const labelVisibility = {};
Niivue.prototype.getLabelVisibility = function (label) {
    if (labelVisibility[label] === undefined) {
        labelVisibility[label] = true;
        return true;
    }
    else {
        return labelVisibility[label];
    }
}

Niivue.prototype.setLabelVisibility = function (label, visible) {
    console.log(label);
    labelVisibility[label] = visible;
    if (this.hiddenBitmap === undefined || this.hiddenBitmap === null || this.hiddenBitmap.length === 0)
        this.hiddenBitmap = new Uint8Array(this.drawBitmap.length);
    if (!visible) {
        for (let i = 0; i < this.drawBitmap.length; i++) {
            if (this.drawBitmap[i] === label) {
                console.log(this.drawBitmap[i])
                this.hiddenBitmap[i] = label;
                this.drawBitmap[i] = 0;
            }
        }
        this.refreshDrawing(false);
    } else {
        for (let i = 0; i < this.hiddenBitmap.length; i++) {
            if (this.hiddenBitmap[i] === label) {
                this.hiddenBitmap[i] = 0;
                if (this.drawBitmap[i] === 0) {
                    this.drawBitmap[i] = label;
                }
            }
        }
        this.refreshDrawing(false);
    }
}

// whether the user drags, resets, or changes contrast programmatically, React will be notified
const _refreshLayers = Niivue.prototype.refreshLayers;
Niivue.prototype.refreshLayers = function (...args) {
    const r = _refreshLayers.apply(this, args);
    if (typeof this.onIntensityChange === "function") {
        this.onIntensityChange(this.volumes?.[0]);
    }
    return r;
};


// const drawAddUndoBitmap = Niivue.prototype.drawAddUndoBitmap;
// // This patching adds visibility filtering to drawings
// Niivue.prototype.drawAddUndoBitmap = async function(){
//     let resp = await drawAddUndoBitmap.call(this);
//     return resp;
// }

// This patch to closeDrawing clears invisible bitmapCache when applied
const closeDrawing = Niivue.prototype.closeDrawing;
/**
 * This patch to closeDrawing clears invisible bitmapCache when applied
 */
Niivue.prototype.closeDrawing = function () {
    clearBitmapOverlay();
    if (this.drawBitmap !== undefined && this.drawBitmap !== null)
        this.hiddenBitmap = new Uint8Array(this.drawBitmap.length);
    else if (this.hiddenBitmap !== undefined)
        this.hiddenBitmap = [];
    closeDrawing.call(this);
}

const _loadDrawingFromUrl = Niivue.prototype.loadDrawingFromUrl;
Niivue.prototype.loadDrawingFromUrl = async function (fnm, isBinarize) {
    clearBitmapOverlay();
    return _loadDrawingFromUrl.call(this, fnm, isBinarize);
};

/**
 * The difference between clear drawing and close drawing is that
 * clear drawing retains itself in the undo stack.
 */
Niivue.prototype.clearDrawing = function () {
    clearBitmapOverlay();
    if (this.drawBitmap != undefined && this.drawBitmap != null) {
        this.drawBitmap = new Uint8Array(this.drawBitmap.length);
        this.hiddenBitmap = new Uint8Array(this.drawBitmap.length);
    }
    this.drawAddUndoBitmap();
    this.refreshDrawing(true)
}

// not included in public docs
// set color of single voxel in drawing
// Include thickness in opts
/**
 * Pen bounds specify the padding added
 * around the drawing center
 * @param x
 * @param y
 * @param z
 * @param penValue
 */
Niivue.prototype.drawPt = function (x, y, z, penValue) {
    const penBounds = this.opts.penBounds ? this.opts.penBounds : 0;
    const dx = this.back.dims[1]
    const dy = this.back.dims[2]
    const dz = this.back.dims[3]
    //Sweep through cubic area, filter by radius
    for (let i = x - penBounds; i <= x + penBounds; i++) {
        for (let j = y - penBounds; j <= y + penBounds; j++) {
            for (let k = z - penBounds; k <= z + penBounds; k++) {
                // (penBounds+1)*(penBounds) as radius filter makes better circles in discrete case
                if ((i - x) * (i - x) + (j - y) * (j - y) + (k - z) * (k - z) <= (penBounds + 1) * (penBounds)) {
                    let xn = Math.min(Math.max(i, 0), dx - 1)
                    let yn = Math.min(Math.max(j, 0), dy - 1)
                    let zn = Math.min(Math.max(k, 0), dz - 1)
                    this.drawBitmap[xn + yn * dx + zn * dx * dy] = penValue;
                }
            }
        }
    }
}

// not included in public docs
// given series of line segments, connect first and last
// voxel and fill the interior of the line segments
// yuelong: fill volumetric interior of the paint space,
// if active draw pen set to invisible
Niivue.prototype.drawPenFilled = function () {
    const nPts = this.drawPenFillPts.length
    if (nPts < 2) {
        // can not fill single line
        this.drawPenFillPts = []
        return
    }
    // do fill in 2D, based on axial (0), coronal (1) or sagittal drawing (2
    const axCorSag = this.drawPenAxCorSag
    // axial is x(0)*y(1) horizontal*vertical
    let h = 0
    let v = 1
    if (axCorSag === 1) {
        v = 2
    } // coronal is x(0)*z(0)
    if (axCorSag === 2) {
        // sagittal is y(1)*z(2)
        h = 1
        v = 2
    }
    const penBounds = this.opts.penBounds ? this.opts.penBounds : 0;
    const w = penBounds * 2 + 1; // Yuelong: paint fill with thickness
    const dims3D = [this.back.dims[h + 1], this.back.dims[v + 1], w] // +1: dims indexed from 0!
    // create bitmap of horizontal*vertical voxels:
    const img3D = new Uint8Array(dims3D[0] * dims3D[1] * dims3D[2])
    let pen = 1 // do not use this.opts.penValue, as "erase" is zero
    function drawPt3D(x, y, penValue) {
        const dx = dims3D[0]
        const dy = dims3D[1]
        const dz = w
        const z = (w - 1) / 2;
        //Sweep through cubic area, filter by radius
        for (let i = x - penBounds; i <= x + penBounds; i++) {
            for (let j = y - penBounds; j <= y + penBounds; j++) {
                for (let k = z - penBounds; k <= z + penBounds; k++) {
                    // (penBounds+1)*(penBounds) as radius filter makes better circles in discrete case
                    if ((i - x) * (i - x) + (j - y) * (j - y) + (k - z) * (k - z) <= (penBounds + 1) * (penBounds)) {
                        let xn = Math.min(Math.max(i, 0), dx - 1)
                        let yn = Math.min(Math.max(j, 0), dy - 1)
                        let zn = Math.min(Math.max(k, 0), dz - 1)
                        img3D[xn + yn * dx + zn * dx * dy] = penValue;
                    }
                }
            }
        }
    }
    function drawLine2D(ptA, ptB /* penValue */) {
        const dx = Math.abs(ptA[0] - ptB[0])
        const dy = Math.abs(ptA[1] - ptB[1])
        // img2D[ptA[0] + ptA[1] * dims2D[0]] = pen
        // img2D[ptB[0] + ptB[1] * dims2D[0]] = pen
        drawPt3D(ptA[0], ptA[1], pen);
        drawPt3D(ptB[0], ptB[1], pen);
        let xs = -1
        let ys = -1
        if (ptB[0] > ptA[0]) {
            xs = 1
        }
        if (ptB[1] > ptA[1]) {
            ys = 1
        }
        let x1 = ptA[0]
        let y1 = ptA[1]
        const x2 = ptB[0]
        const y2 = ptB[1]
        if (dx >= dy) {
            // Driving axis is X-axis"
            let p1 = 2 * dy - dx
            while (x1 !== x2) {
                x1 += xs
                if (p1 >= 0) {
                    y1 += ys
                    p1 -= 2 * dx
                }
                p1 += 2 * dy
                drawPt3D(x1, y1, pen);
            }
        } else {
            // Driving axis is Y-axis"
            let p1 = 2 * dx - dy
            while (y1 !== y2) {
                y1 += ys
                if (p1 >= 0) {
                    x1 += xs
                    p1 -= 2 * dy
                }
                p1 += 2 * dx
                drawPt3D(x1, y1, pen);
            }
        }
    }
    const startPt = [this.drawPenFillPts[0][h], this.drawPenFillPts[0][v]]
    let prevPt = startPt
    for (let i = 1; i < nPts; i++) {
        const pt = [this.drawPenFillPts[i][h], this.drawPenFillPts[i][v]]
        drawLine2D(prevPt, pt)
        prevPt = pt
    }
    drawLine2D(startPt, prevPt) // close drawing
    // flood fill
    const seeds = []
    function setSeed(pt) { // pt 2D -> 3D
        if (pt[0] < 0 || pt[1] < 0 || pt[2] < 0 || pt[0] >= dims3D[0] || pt[1] >= dims3D[1] || pt[3] >= dims3D[2]) {
            return
        }
        const pxl = pt[0] + pt[1] * dims3D[0] + pt[2] * dims3D[0] * dims3D[1]
        if (img3D[pxl] !== 0) {
            return
        } // not blank
        seeds.push(pt)
        img3D[pxl] = 2
    }
    // https://en.wikipedia.org/wiki/Flood_fill
    // first seed all edges
    // // bottom row
    // for (let i = 0; i < dims2D[0]; i++) {
    //     setSeed([i, 0])
    // }
    // // top row
    // for (let i = 0; i < dims2D[0]; i++) {
    //     setSeed([i, dims2D[1] - 1])
    // }
    // // left column
    // for (let i = 0; i < dims2D[1]; i++) {
    //     setSeed([0, i])
    // }
    // // right columns
    // for (let i = 0; i < dims2D[1]; i++) {
    //     setSeed([dims2D[0] - 1, i])
    // }
    // Yuelong: Instead of seeding all edges, seed eight corners of the bounding box,
    setSeed([0, 0, 0]);
    setSeed([dims3D[0] - 1, 0, 0]);
    setSeed([0, dims3D[1] - 1, 0]);
    setSeed([dims3D[0] - 1, dims3D[1] - 1, 0]);
    setSeed([0, 0, dims3D[2] - 1]);
    setSeed([dims3D[0] - 1, 0, dims3D[2] - 1]);
    setSeed([0, dims3D[1] - 1, dims3D[2] - 1]);
    setSeed([dims3D[0] - 1, dims3D[1] - 1, dims3D[2] - 1]);
    // now retire first in first out
    while (seeds.length > 0) {
        // always remove one seed, plant 0..4 new ones
        const seed = seeds.shift()
        setSeed([seed[0] - 1, seed[1], seed[2]])
        setSeed([seed[0] + 1, seed[1], seed[2]])
        setSeed([seed[0], seed[1] - 1, seed[2]])
        setSeed([seed[0], seed[1] + 1, seed[2]])
        // Yuelong: flood fill z-axis as well
        setSeed([seed[0], seed[1], seed[2] + 1])
        setSeed([seed[0], seed[1], seed[2] - 1])
    }
    // all voxels with value of zero have no path to edges
    // insert surviving pixels from 2D bitmap into 3D bitmap
    pen = this.opts.penValue
    const slice = this.drawPenFillPts[0][3 - (h + v)]
    // if (axCorSag === 0) {
    //     // axial
    //     const offset = slice * dims2D[0] * dims2D[1]
    //     for (let i = 0; i < dims2D[0] * dims2D[1]; i++) {
    //         if (img2D[i] !== 2) {
    //             this.drawBitmap[i + offset] = pen
    //         }
    //     }
    // } else {
    //     let xStride = 1 // coronal: horizontal LR pixels contiguous
    //     const yStride = this.back.dims[1] * this.back.dims[2] // coronal: vertical is slice
    //     let zOffset = slice * this.back.dims[1] // coronal: slice is number of columns
    //     if (axCorSag === 2) {
    //         // sagittal
    //         xStride = this.back.dims[1]
    //         zOffset = slice
    //     }
    //     let i = 0
    //     for (let y = 0; y < dims2D[1]; y++) {
    //         for (let x = 0; x < dims2D[0]; x++) {
    //             if (img2D[i] !== 2) {
    //                 this.drawBitmap[x * xStride + y * yStride + zOffset] = pen
    //             }
    //             i++
    //         }
    //     }
    // }
    // Stride with permutation symmetry
    let strides = [1, this.back.dims[1], this.back.dims[1] * this.back.dims[2]];
    // xStride = s0 for axial and coronal, s1 for sagital
    let xStride = (axCorSag == 2) ? strides[1] : strides[0];
    // yStride = s1 for axial, s2 for coronal and sagital
    const yStride = (axCorSag == 0) ? strides[1] : strides[2];
    // zStride = s2 for axial, s1 for coronal, s0 for sagital
    const zStride = strides[2 - axCorSag];
    const zOffset = slice * zStride;
    let i = 0
    for (let z = -penBounds; z <= penBounds; z++) {
        for (let y = 0; y < dims3D[1]; y++) {
            for (let x = 0; x < dims3D[0]; x++) {
                if (img3D[i] !== 2) {
                    // Fill by 3D traversal
                    this.drawBitmap[x * xStride + y * yStride + zOffset + z * zStride] = pen
                }
                i++
            }
        }
    }
    // this.drawUndoBitmaps[this.currentDrawUndoBitmap]
    if (!this.drawFillOverwrites && this.drawUndoBitmaps[this.currentDrawUndoBitmap].length > 0) {
        const nv = this.drawBitmap.length
        const bmp = decodeRLE(this.drawUndoBitmaps[this.currentDrawUndoBitmap], nv)
        for (let i = 0; i < nv; i++) {
            if (bmp[i] === 0) {
                continue
            }
            this.drawBitmap[i] = bmp[i]
        }
    }
    this.drawPenFillPts = []
    // First imprint all hiddenBitmaps into the draw bitmap,
    // visible voxels take precedence
    if (this.hiddenBitmap)
        this.hiddenBitmap.map((value, index) => {
            if (value !== 0 && this.drawBitmap[index] === 0) {
                this.drawBitmap[index] = value;
            }
        })
    this.drawAddUndoBitmap()
    // Post-processing to hide hidden voxels
    this.hiddenBitmap = new Uint8Array(this.drawBitmap.length);
    for (let i = 0; i < this.drawBitmap.length; i++) {
        let pen = this.drawBitmap[i];
        if (!this.getLabelVisibility(pen)) {
            this.hiddenBitmap[i] = this.drawBitmap[i];
            this.drawBitmap[i] = 0;
        }
    }
    this.refreshDrawing(false)
}

Niivue.prototype.fillRange = function (min, max, penValue, inverted = false,
    original = undefined, setOriginal = (original) => { }) {
    console.log(this.volumes);
    let volume = this.volumes[0];
    if (volume == undefined) {
        return;
    }
    if (!this.drawBitmap) {
        this.createEmptyDrawing();
    }
    // First load underlying imprinting
    if (original == undefined) {
        setOriginal([...this.drawBitmap]);
    } else {
        this.drawBitmap = new Uint8Array(original);
    }
    console.log(volume.img.length);
    console.log(this.drawBitmap.length);
    // Next write into the drawbitmap where voxel value are within range,
    // no need to write into hidden bitmap specifically due to the post-processing
    // step, where draw bitmap values will be hidden accordingly

    const dx = this.back.dims[1]
    const dy = this.back.dims[2]
    const dz = this.back.dims[3]
    for (let x = 0; x < dx; x++)
        for (let y = 0; y < dy; y++)
            for (let z = 0; z < dz; z++) {
                let i = x + y * dx + z * dx * dy;
                let val = volume.getValue(x, y, z);
                if ((!inverted && (min <= val && max >= val)) ||
                    //Note here that e-4 is not a trivial value,
                    // we can do this here because ranges beneath e-4 will be rescaled inside
                    // the checkRange function inside Niivue.jsx. It is still not entirely safe
                    // but a necessary step for inclusive range checking under float inprecisions
                    (inverted && (min >= val || max < val))) {
                    // console.log('filling');
                    this.drawBitmap[i] = penValue;
                }
            }
    // Next update drawUndoBitmaps pipeline
    // First imprint all hiddenBitmaps into the draw bitmap,
    // visible voxels take precedence
    if (this.hiddenBitmap)
        this.hiddenBitmap.map((value, index) => {
            if (value !== 0 && this.drawBitmap[index] === 0) {
                this.drawBitmap[index] = value;
            }
        })
    // Post-processing to hide invisible voxels
    this.hiddenBitmap = new Uint8Array(this.drawBitmap.length);
    for (let i = 0; i < this.drawBitmap.length; i++) {
        let pen = this.drawBitmap[i];
        if (!this.getLabelVisibility(pen)) {
            this.hiddenBitmap[i] = this.drawBitmap[i];
            this.drawBitmap[i] = 0;
        }
    }
    this.refreshDrawing(true)
    // props.nv.drawScene()
}

Niivue.prototype.drawAddUndoBitmapWithHiddenVoxels = function () {
    // Next update drawUndoBitmaps pipeline
    // First imprint all hiddenBitmaps into the draw bitmap,
    // visible voxels take precedence
    if (this.hiddenBitmap)
        this.hiddenBitmap.map((value, index) => {
            if (value !== 0 && this.drawBitmap[index] === 0) {
                this.drawBitmap[index] = value;
            }
        })
    this.drawAddUndoBitmap()
    // Post-processing to hide invisible voxels
    this.hiddenBitmap = new Uint8Array(this.drawBitmap.length);
    for (let i = 0; i < this.drawBitmap.length; i++) {
        let pen = this.drawBitmap[i];
        if (!this.getLabelVisibility(pen)) {
            this.hiddenBitmap[i] = this.drawBitmap[i];
            this.drawBitmap[i] = 0;
        }
    }
}

/**
 * Restore drawing to previous state
 * @example niivue.drawUndo();
 * @see {@link https://niivue.github.io/niivue/features/draw.ui.html|live demo usage}
 * Yuelong: drawundo hides invisible rois in post processing
 */
Niivue.prototype.drawUndo = function () {
    if (this.drawUndoBitmaps.length < 1) {
        console.debug('undo bitmaps not loaded')
        return
    }
    this.currentDrawUndoBitmap--
    if (this.currentDrawUndoBitmap < 0) {
        this.currentDrawUndoBitmap = this.drawUndoBitmaps.length - 1
    }
    if (this.currentDrawUndoBitmap >= this.drawUndoBitmaps.length) {
        this.currentDrawUndoBitmap = 0
    }
    if (this.drawUndoBitmaps[this.currentDrawUndoBitmap].length < 2) {
        console.debug('drawUndo is misbehaving')
        return
    }
    this.drawBitmap = decodeRLE(this.drawUndoBitmaps[this.currentDrawUndoBitmap], this.drawBitmap.length)
    // Post-processing to hide invisible region and reveal hidden ones
    this.hiddenBitmap = new Uint8Array(this.drawBitmap.length);
    for (let i = 0; i < this.drawBitmap.length; i++) {
        let pen = this.drawBitmap[i];
        if (!this.getLabelVisibility(pen)) {
            this.hiddenBitmap[i] = this.drawBitmap[i];
            this.drawBitmap[i] = 0;
        }
    }
    this.refreshDrawing(true)
}

/**
 * save voxel-based image to disk
 * @param {string} fnm filename of NIfTI image to create
 * @param {boolean} [false] isSaveDrawing determines whether drawing or background image is saved
 * @param {number} [0] volumeByIndex determines layer to save (0 for background)
 * @param {number} [0] volumeByIndex determines layer to save (0 for background)
 * @example niivue.saveImage('test.nii', true);
 * @see {@link https://niivue.github.io/niivue/features/draw.ui.html|live demo usage}
 */
Niivue.prototype.saveImageByLabels = async function (fnm, labels = [1]) {
    if (this.back.dims === undefined) {
        console.debug('No voxelwise image open')
        return false
    }
    if (!this.drawBitmap) {
        console.debug('No drawing open')
        return false
    }
    const live = this.drawBitmap
    const resolved = getResolvedDrawBitmapForExport(this)
    const perm = this.volumes[0].permRAS
    if (perm[0] === 1 && perm[1] === 2 && perm[2] === 3) {
        const outFlat = new Uint8Array(live.length)
        for (let i = 0; i < live.length; i++) {
            outFlat[i] = labels.indexOf(live[i]) >= 0 ? resolved[i] : 0
        }
        await this.volumes[0].saveToDisk(fnm, outFlat)
        return true
    } else {
        const dims = this.volumes[0].hdr.dims // reverse to original
        // reverse RAS to native space, layout is mrtrix MIF format
        // for details see NVImage.readMIF()
        const layout = [0, 0, 0]
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (Math.abs(perm[i]) - 1 !== j) continue
                layout[j] = i * Math.sign(perm[i])
            }
        }
        let stride = 1
        const instride = [1, 1, 1]
        const inflip = [false, false, false]
        for (let i = 0; i < layout.length; i++) {
            for (let j = 0; j < layout.length; j++) {
                const a = Math.abs(layout[j])
                if (a !== i) continue
                instride[j] = stride
                // detect -0: https://medium.com/coding-at-dawn/is-negative-zero-0-a-number-in-javascript-c62739f80114
                if (layout[j] < 0 || Object.is(layout[j], -0)) inflip[j] = true
                stride *= dims[j + 1]
            }
        }
        // lookup table for flips and stride offsets:
        const range = (start, stop, step) =>
            Array.from({ length: (stop - start) / step + 1 }, (_, i) => start + i * step)
        let xlut = range(0, dims[1] - 1, 1)
        if (inflip[0]) xlut = range(dims[1] - 1, 0, -1)
        for (let i = 0; i < dims[1]; i++) xlut[i] *= instride[0]
        let ylut = range(0, dims[2] - 1, 1)
        if (inflip[1]) ylut = range(dims[2] - 1, 0, -1)
        for (let i = 0; i < dims[2]; i++) ylut[i] *= instride[1]
        let zlut = range(0, dims[3] - 1, 1)
        if (inflip[2]) zlut = range(dims[3] - 1, 0, -1)
        for (let i = 0; i < dims[3]; i++) zlut[i] *= instride[2]
        // convert data â€” mask by current (possibly merged) label; write underlying ungrouped IDs

        const outVs = new Uint8Array(dims[1] * dims[2] * dims[3])
        let j = 0
        for (let z = 0; z < dims[3]; z++) {
            for (let y = 0; y < dims[2]; y++) {
                for (let x = 0; x < dims[1]; x++) {
                    const idx = xlut[x] + ylut[y] + zlut[z]
                    const bitLive = live[idx]
                    outVs[j] = (labels.indexOf(bitLive) >= 0) ? resolved[idx] : 0
                    j++
                }
            }
        }
        await this.volumes[0].saveToDisk(fnm, outVs)
        return true
    }
}

Niivue.prototype.deleteDrawingByLabel = function (labels = [0]) {
    clearBitmapOverlay();
    for (let i = 0; i < this.drawBitmap.length; i++) {
        this.drawBitmap[i] = (labels.indexOf(this.drawBitmap[i]) < 0) ? this.drawBitmap[i] : 0;
    }
    this.refreshDrawing(false);
}

Niivue.prototype.groupLabelsInto = function (sourceLabels = [0], targetLabel = 7) {
    for (let i = 0; i < this.drawBitmap.length; i++) {
        if (sourceLabels.indexOf(this.drawBitmap[i]) >= 0) {
            for (let k = bitmapOverlay.length - 1; k >= 0; k--) {
                if (bitmapOverlay[k][0] === i) {
                    bitmapOverlay.splice(k, 1);
                }
            }
            bitmapOverlay.push([i, this.drawBitmap[i]]);
            this.drawBitmap[i] = targetLabel;
        }
    }
    this.refreshDrawing(false);
}

Niivue.prototype.ungroup = function () {
    for (let tuple of bitmapOverlay) {
        this.drawBitmap[tuple[0]] = tuple[1];
    }
    bitmapOverlay.length = 0;
    this.refreshDrawing(false);
}

/**
 * Smart group from ROI table selection.
 * - Extend: selection includes merged label(s) >= targetLabel â†’ mask those voxels, ungroup once, merge into max(merged ids in selection) (e.g. add to 7 or 8).
 * - New merge (primitives only): if no merged id >= targetLabel exists in the volume, merge into targetLabel (7); else merge into maxMergedInVolume + 1 (e.g. second group â†’ 8).
 */
Niivue.prototype.groupLabelsFromSelection = function (sourceLabels = [], targetLabel = 7) {
    if (!this.drawBitmap || !sourceLabels || sourceLabels.length < 2) {
        return;
    }
    const labelSet = new Set(sourceLabels);
    if (labelSet.size < 2) {
        return;
    }
    const MERGE_THRESHOLD = targetLabel;
    const mergedInSelection = sourceLabels.filter(function (l) {
        return l >= MERGE_THRESHOLD;
    });
    if (mergedInSelection.length > 0) {
        const mergeTarget = Math.max.apply(null, mergedInSelection);
        const n = this.drawBitmap.length;
        const mask = new Uint8Array(n);
        for (let i = 0; i < n; i++) {
            if (labelSet.has(this.drawBitmap[i])) {
                mask[i] = 1;
            }
        }
        this.ungroup();
        const mergeSet = new Set();
        for (let i = 0; i < n; i++) {
            if (mask[i] && this.drawBitmap[i] !== 0) {
                mergeSet.add(this.drawBitmap[i]);
            }
        }
        const toMerge = Array.from(mergeSet).sort(function (a, b) { return a - b; });
        if (toMerge.length === 0) {
            this.refreshDrawing(false);
            return;
        }
        this.groupLabelsInto(toMerge, mergeTarget);
        return;
    }
    var sceneMaxMerged = 0;
    for (var j = 0; j < this.drawBitmap.length; j++) {
        var v = this.drawBitmap[j];
        if (v >= MERGE_THRESHOLD) {
            sceneMaxMerged = Math.max(sceneMaxMerged, v);
        }
    }
    var newTarget = sceneMaxMerged >= MERGE_THRESHOLD ? sceneMaxMerged + 1 : MERGE_THRESHOLD;
    this.groupLabelsInto(sourceLabels, newTarget);
};

Niivue.prototype.resetScene = function () {
    this.scene.pan2Dxyzmm = [0, 0, 0, 1]
    this.drawScene();
}

Niivue.prototype.recenter = function () {
    // this.scene.pan2Dxyzmm[0] = 0;
    // this.scene.pan2Dxyzmm[1] = 0;
    // this.scene.pan2Dxyzmm[2] = 0;

    const zoom = this.scene.pan2Dxyzmm[3];
    this.scene.pan2Dxyzmm = [0, 0, 0, 1];
    const zoomChange = this.scene.pan2Dxyzmm[3] - zoom
    this.scene.pan2Dxyzmm[3] = zoom;
    const mm = this.frac2mm([0.5, 0.5, 0.5])
    this.scene.pan2Dxyzmm[0] += zoomChange * mm[0]
    this.scene.pan2Dxyzmm[1] += zoomChange * mm[1]
    this.scene.pan2Dxyzmm[2] += zoomChange * mm[2]
    this.drawScene()
}


Niivue.prototype.resetZoom = function () {
    // this.scene.pan2Dxyzmm[0] = 0;
    // this.scene.pan2Dxyzmm[1] = 0;
    // this.scene.pan2Dxyzmm[2] = 0;

    const zoom = 1;

    const zoomChange = this.scene.pan2Dxyzmm[3] - zoom
    this.scene.pan2Dxyzmm[3] = zoom;
    const mm = this.frac2mm(this.scene.crosshairPos)
    this.scene.pan2Dxyzmm[0] += zoomChange * mm[0]
    this.scene.pan2Dxyzmm[1] += zoomChange * mm[1]
    this.scene.pan2Dxyzmm[2] += zoomChange * mm[2]
    this.drawScene()
}

Niivue.prototype.setCenteredZoom = function (zoom) {
    this.scene.pan2Dxyzmm[0] = 0;
    this.scene.pan2Dxyzmm[1] = 0;
    this.scene.pan2Dxyzmm[2] = 0;

    const zoomChange = this.scene.pan2Dxyzmm[3] - zoom
    this.scene.pan2Dxyzmm[3] = zoom;
    const mm = this.frac2mm(this.scene.crosshairPos)
    this.scene.pan2Dxyzmm[0] += zoomChange * mm[0]
    this.scene.pan2Dxyzmm[1] += zoomChange * mm[1]
    this.scene.pan2Dxyzmm[2] += zoomChange * mm[2]
    this.drawScene()
}

Niivue.prototype.resetContrast = function () {
    this.volumes[0].cal_min = this.volumes[0].robust_min;
    this.volumes[0].cal_max = this.volumes[0].robust_max;
    this.onIntensityChange(this.volumes[0]);
    this.refreshLayers(this.volumes[0], 0);
    this.drawScene();
    if (this.onResetContrast)
        this.onResetContrast();
}

Niivue.prototype.relabelROIs = function (source = 0, target = 0) {
    clearBitmapOverlay();
    for (let i = 0; i < this.drawBitmap.length; i++) {
        if (this.drawBitmap[i] === source) {
            this.drawBitmap[i] = target;
        }
    }
    this.refreshDrawing(true);
}

Niivue.prototype.loadDrawingFromBase64 = async function (fnm, base64) {
    if (this.drawBitmap) {
        console.debug('Overwriting open drawing!')
    }
    this.drawClearAllUndoBitmaps()
    clearBitmapOverlay()
    try {
        // const volume = await NVImage.loadFromUrl()
        if (base64) {
            let imageOptions = NVImageFromUrlOptions(fnm);
            const drawingBitmap = NVImage.loadFromBase64({ name: fnm, base64 })
            if (drawingBitmap) {
                this.loadDrawing(drawingBitmap)
            }
        }
    } catch (err) {
        console.error(err);
        console.error('loadDrawingFromBlob() failed to load ' + fnm)
        this.drawClearAllUndoBitmaps()
        clearBitmapOverlay()
    }
    return base64 !== undefined;
}

/**
 * Merge an uploaded/loaded drawing into the current drawBitmap instead of replacing it.
 * Non-zero import voxels overwrite the current bitmap (same as drawing a new ROI on top).
 * Import label IDs are reused when that ID is not already on the canvas (same color as when drawn);
 * otherwise they are remapped to the next free ID to avoid collisions.
 * @returns {{ ok: boolean, importLabelRemap: Record<number, number>|null }}
 *   importLabelRemap null means the full scene was loaded with loadDrawing (no prior drawing).
 */
Niivue.prototype.mergeDrawingFromBase64 = async function (fnm, base64) {
    const result = { ok: false, importLabelRemap: null };
    if (!base64) {
        return result;
    }
    try {
        if (!this.back) {
            throw new Error('back undefined');
        }
        const drawingBitmap = NVImage.loadFromBase64({ name: fnm, base64 });
        if (!drawingBitmap || !drawingBitmap.hdr || !drawingBitmap.hdr.dims) {
            return result;
        }
        const dims = drawingBitmap.hdr.dims;
        if (
            dims[1] !== this.back.hdr.dims[1] ||
            dims[2] !== this.back.hdr.dims[2] ||
            dims[3] !== this.back.hdr.dims[3]
        ) {
            console.warn('mergeDrawingFromBase64: drawing dimensions do not match background');
            return result;
        }
        const vx = dims[1] * dims[2] * dims[3];
        const perm = drawingBitmap.permRAS;
        const layout = [0, 0, 0];
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (Math.abs(perm[i]) - 1 !== j) {
                    continue;
                }
                layout[j] = i * Math.sign(perm[i]);
            }
        }
        let stride = 1;
        const instride = [1, 1, 1];
        const inflip = [false, false, false];
        for (let i = 0; i < layout.length; i++) {
            for (let j = 0; j < layout.length; j++) {
                const a = Math.abs(layout[j]);
                if (a !== i) {
                    continue;
                }
                instride[j] = stride;
                if (layout[j] < 0 || Object.is(layout[j], -0)) {
                    inflip[j] = true;
                }
                stride *= dims[j + 1];
            }
        }
        const nvRange = (start, end, step) => {
            const o = [];
            if (step > 0) {
                for (let i = start; i <= end; i += step) {
                    o.push(i);
                }
            } else {
                for (let i = start; i >= end; i += step) {
                    o.push(i);
                }
            }
            return o;
        };
        let xlut = nvRange(0, dims[1] - 1, 1);
        if (inflip[0]) {
            xlut = nvRange(dims[1] - 1, 0, -1);
        }
        for (let i = 0; i < dims[1]; i++) {
            xlut[i] *= instride[0];
        }
        let ylut = nvRange(0, dims[2] - 1, 1);
        if (inflip[1]) {
            ylut = nvRange(dims[2] - 1, 0, -1);
        }
        for (let i = 0; i < dims[2]; i++) {
            ylut[i] *= instride[1];
        }
        let zlut = nvRange(0, dims[3] - 1, 1);
        if (inflip[2]) {
            zlut = nvRange(dims[3] - 1, 0, -1);
        }
        for (let i = 0; i < dims[3]; i++) {
            zlut[i] *= instride[2];
        }

        const inVs = drawingBitmap.img;
        const importFlat = new Uint8Array(vx);
        let ji = 0;
        for (let z = 0; z < dims[3]; z++) {
            for (let y = 0; y < dims[2]; y++) {
                for (let x = 0; x < dims[1]; x++) {
                    importFlat[xlut[x] + ylut[y] + zlut[z]] = inVs[ji];
                    ji++;
                }
            }
        }

        const hasExistingDrawing =
            this.drawBitmap &&
            this.drawBitmap.length === vx &&
            this.drawBitmap.some((v) => v !== 0);

        if (this.drawBitmap && this.drawBitmap.length !== vx) {
            console.warn('mergeDrawingFromBase64: drawBitmap size mismatch; replacing drawing');
            clearBitmapOverlay();
            this.loadDrawing(drawingBitmap);
            result.ok = true;
            result.importLabelRemap = null;
            return result;
        }

        if (!hasExistingDrawing) {
            clearBitmapOverlay();
            this.loadDrawing(drawingBitmap);
            result.ok = true;
            result.importLabelRemap = null;
            return result;
        }

        const usedOnCanvas = new Set();
        for (let i = 0; i < this.drawBitmap.length; i++) {
            const v = this.drawBitmap[i];
            if (v !== 0) {
                usedOnCanvas.add(v);
            }
        }

        const seen = new Set();
        for (let i = 0; i < importFlat.length; i++) {
            const v = importFlat[i];
            if (v !== 0) {
                seen.add(v);
            }
        }
        const sorted = Array.from(seen).sort((a, b) => a - b);
        const importLabelRemap = {};
        let nextSynthetic = 0;
        for (const v of usedOnCanvas) {
            if (v > nextSynthetic) {
                nextSynthetic = v;
            }
        }
        nextSynthetic += 1;

        for (let s = 0; s < sorted.length; s++) {
            const oldL = sorted[s];
            if (!usedOnCanvas.has(oldL)) {
                importLabelRemap[oldL] = oldL;
                usedOnCanvas.add(oldL);
            } else {
                while (usedOnCanvas.has(nextSynthetic)) {
                    nextSynthetic++;
                }
                importLabelRemap[oldL] = nextSynthetic;
                usedOnCanvas.add(nextSynthetic);
                nextSynthetic++;
            }
        }

        const importWrittenVoxels = new Set();
        for (let i = 0; i < vx; i++) {
            if (importFlat[i] !== 0) {
                importWrittenVoxels.add(i);
            }
        }
        stripBitmapOverlayForVoxelIndices(importWrittenVoxels);

        for (let i = 0; i < vx; i++) {
            const v = importFlat[i];
            if (v === 0) {
                continue;
            }
            // Upload wins overlaps (matches pen drawing on top of another ROI)
            this.drawBitmap[i] = importLabelRemap[v];
        }

        this.drawAddUndoBitmap();
        this.refreshDrawing(false);
        this.drawScene();
        result.ok = true;
        result.importLabelRemap = importLabelRemap;
        return result;
    } catch (err) {
        console.error(err);
        console.error('mergeDrawingFromBase64() failed to load ' + fnm);
        return result;
    }
};

// not included in public docs
// show text labels for L/R, A/P, I/S dimensions
Niivue.prototype.drawSliceOrientationText = function (leftTopWidthHeight, axCorSag) {
    if (this.hideText) {
        return;
    }
    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height)
    let topText = 'S'
    if (axCorSag === SLICE_TYPE.AXIAL) {
        topText = 'A'
    }
    let leftText = this.opts.isRadiologicalConvention ? 'R' : 'L'
    if (axCorSag === SLICE_TYPE.SAGITTAL) {
        leftText = this.opts.sagittalNoseLeft ? 'A' : 'P'
    }
    if (this.opts.isCornerOrientationText) {
        this.drawTextRightBelow([leftTopWidthHeight[0], leftTopWidthHeight[1]], leftText + topText)
        return
    }
    this.drawTextBelow([leftTopWidthHeight[0] + leftTopWidthHeight[2] * 0.5, leftTopWidthHeight[1]], topText)

    this.drawTextRight([leftTopWidthHeight[0], leftTopWidthHeight[1] + leftTopWidthHeight[3] * 0.5], leftText)
}

// not included in public docs
// draw line (can be diagonal)
// unless Alpha is > 0, default color is opts.crosshairColor
Niivue.prototype.drawLine = function (startXYendXY, thickness = 1, lineColor = [1, 0, 0, -1]) {
    console.log(startXYendXY);
    this.gl.bindVertexArray(this.genericVAO)
    if (!this.lineShader) {
        throw new Error('lineShader undefined')
    }
    this.lineShader.use(this.gl)
    if (lineColor[3] < 0) {
        lineColor = this.opts.crosshairColor
    }
    this.gl.uniform4fv(this.lineShader.uniforms.lineColor, lineColor)
    this.gl.uniform2fv(this.lineShader.uniforms.canvasWidthHeight, [this.gl.canvas.width, this.gl.canvas.height])
    // draw Line
    this.gl.uniform1f(this.lineShader.uniforms.thickness, thickness)
    this.gl.uniform4fv(this.lineShader.uniforms.startXYendXY, startXYendXY)
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4)
    this.gl.bindVertexArray(this.unusedVAO) // set vertex attributes
}

// not included in public docs
// note: no test yet
Niivue.prototype.calculateNewRange = function ({ volIdx = 0 } = {}) {
    if (this.opts.sliceType === SLICE_TYPE.RENDER && this.sliceMosaicString.length < 1) {
        return
    }
    if (this.uiData.dragStart[0] === this.uiData.dragEnd[0] && this.uiData.dragStart[1] === this.uiData.dragEnd[1]) {
        return
    }
    // calculate our box
    let frac = this.canvasPos2frac([this.uiData.dragStart[0], this.uiData.dragStart[1]])
    if (frac[0] < 0) {
        return
    }
    const startVox = this.frac2vox(frac, volIdx)
    frac = this.canvasPos2frac([this.uiData.dragEnd[0], this.uiData.dragEnd[1]])
    if (frac[0] < 0) {
        return
    }
    const endVox = this.frac2vox(frac, volIdx)

    let hi = -Number.MAX_VALUE
    let lo = Number.MAX_VALUE
    const xrange = this.calculateMinMaxVoxIdx([startVox[0], endVox[0]])
    const yrange = this.calculateMinMaxVoxIdx([startVox[1], endVox[1]])
    const zrange = this.calculateMinMaxVoxIdx([startVox[2], endVox[2]])

    // for our constant dimension we add one so that the for loop runs at least once
    if (startVox[0] - endVox[0] === 0) {
        xrange[1] = startVox[0] + 1
    } else if (startVox[1] - endVox[1] === 0) {
        yrange[1] = startVox[1] + 1
    } else if (startVox[2] - endVox[2] === 0) {
        zrange[1] = startVox[2] + 1
    }

    const hdr = this.volumes[volIdx].hdr
    const img = this.volumes[volIdx].img
    if (!hdr || !img) {
        return
    }

    const xdim = hdr.dims[1]
    const ydim = hdr.dims[2]
    for (let z = zrange[0]; z < zrange[1]; z++) {
        const zi = z * xdim * ydim
        for (let y = yrange[0]; y < yrange[1]; y++) {
            const yi = y * xdim
            for (let x = xrange[0]; x < xrange[1]; x++) {
                const index = zi + yi + x
                if (lo > img[index]) {
                    lo = img[index]
                }
                if (hi < img[index]) {
                    hi = img[index]
                }
            }
        }
    }
    if (lo >= hi) {
        return
    } // no variability or outside volume
    const mnScale = intensityRaw2Scaled(hdr, lo)
    const mxScale = intensityRaw2Scaled(hdr, hi)
    this.volumes[volIdx].cal_min = mnScale
    this.volumes[volIdx].cal_max = mxScale
    console.log(mnScale);
    console.log(mxScale);
    this.onIntensityChange(this.volumes[volIdx])
}

function create3() {
    var out = new Float32Array();
    // if (ARRAY_TYPE != Float32Array) {
    //     out[0] = 0;
    //     out[1] = 0;
    //     out[2] = 0;
    // }
    return out;
}

function swizzleVec3(vec, order = [0, 1, 2]) {
    const vout = create3();
    vout[0] = vec[order[0]];
    vout[1] = vec[order[1]];
    vout[2] = vec[order[2]];
    return vout;
}

Niivue.prototype.drawCrossLinesMM = function (sliceIndex, axCorSag, axiMM, corMM, sagMM) {
    console.log('method called');
    if (sliceIndex < 0 || this.screenSlices.length <= sliceIndex) {
        return;
    }
    const tile = this.screenSlices[sliceIndex];
    let sliceFrac = tile.sliceFrac;
    const isRender = sliceFrac === Infinity;
    if (isRender) {
        console.warn("Rendering approximate cross lines in world view mode");
    }
    if (sliceFrac === Infinity) {
        sliceFrac = 0.5;
    }
    let linesH = corMM.slice();
    let linesV = sagMM.slice();
    const thick = Math.max(7, this.opts.crosshairWidth);
    if (axCorSag === SLICE_TYPE.CORONAL) {
        linesH = axiMM.slice();
    }
    if (axCorSag === SLICE_TYPE.SAGITTAL) {
        linesH = axiMM.slice();
        linesV = corMM.slice();
    }
    function mm2screen(mm) {
        const screenXY = [0, 0];
        screenXY[0] = tile.leftTopWidthHeight[0] + (mm[0] - tile.leftTopMM[0]) / tile.fovMM[0] * tile.leftTopWidthHeight[2];
        screenXY[1] = tile.leftTopWidthHeight[1] + tile.leftTopWidthHeight[3] - (mm[1] - tile.leftTopMM[1]) / tile.fovMM[1] * tile.leftTopWidthHeight[3];
        return screenXY;
    }
    if (linesH.length > 0 && axCorSag === 0) {
        const fracZ = sliceFrac;
        const dimV = 1;
        for (let i2 = 0; i2 < linesH.length; i2++) {
            const mmV = this.frac2mm([0.5, 0.5, 0.5]);
            mmV[dimV] = linesH[i2];
            let fracY = this.mm2frac(mmV);
            fracY = fracY[dimV];
            let left = this.frac2mm([0, fracY, fracZ]);
            left = swizzleVec3(left, [0, 1, 2]);
            let right = this.frac2mm([1, fracY, fracZ]);
            right = swizzleVec3(right, [0, 1, 2]);
            left = mm2screen(left);
            right = mm2screen(right);
            this.drawLine([left[0], left[1], right[0], right[1]], thick);
        }
    }
    if (linesH.length > 0 && axCorSag === 1) {
        const fracH = sliceFrac;
        const dimV = 2;
        for (let i2 = 0; i2 < linesH.length; i2++) {
            const mmV = this.frac2mm([0.5, 0.5, 0.5]);
            mmV[dimV] = linesH[i2];
            let fracV = this.mm2frac(mmV);
            fracV = fracV[dimV];
            let left = this.frac2mm([0, fracH, fracV]);
            left = swizzleVec3(left, [0, 2, 1]);
            let right = this.frac2mm([1, fracH, fracV]);
            right = swizzleVec3(right, [0, 2, 1]);
            left = mm2screen(left);
            right = mm2screen(right);
            this.drawLine([left[0], left[1], right[0], right[1]], thick);
        }
    }
    if (linesH.length > 0 && axCorSag === 2) {
        const fracX = sliceFrac;
        const dimV = 2;
        for (let i2 = 0; i2 < linesH.length; i2++) {
            const mmV = this.frac2mm([0.5, 0.5, 0.5]);
            mmV[dimV] = linesH[i2];
            let fracZ = this.mm2frac(mmV);
            fracZ = fracZ[dimV];
            let left = this.frac2mm([fracX, 0, fracZ]);
            left = swizzleVec3(left, [1, 2, 0]);
            let right = this.frac2mm([fracX, 1, fracZ]);
            right = swizzleVec3(right, [1, 2, 0]);
            left = mm2screen(left);
            right = mm2screen(right);
            this.drawLine([left[0], left[1], right[0], right[1]], thick);
        }
    }
    if (linesV.length > 0 && axCorSag === 0) {
        const fracZ = sliceFrac;
        const dimH = 0;
        for (let i2 = 0; i2 < linesV.length; i2++) {
            const mm = this.frac2mm([0.5, 0.5, 0.5]);
            mm[dimH] = linesV[i2];
            let frac = this.mm2frac(mm);
            frac = frac[dimH];
            let left = this.frac2mm([frac, 0, fracZ]);
            left = swizzleVec3(left, [0, 1, 2]);
            let right = this.frac2mm([frac, 1, fracZ]);
            right = swizzleVec3(right, [0, 1, 2]);
            left = mm2screen(left);
            right = mm2screen(right);
            this.drawLine([left[0], left[1], right[0], right[1]], thick);
        }
    }
    if (linesV.length > 0 && axCorSag === 1) {
        const fracY = sliceFrac;
        const dimH = 0;
        for (let i2 = 0; i2 < linesV.length; i2++) {
            const mm = this.frac2mm([0.5, 0.5, 0.5]);
            mm[dimH] = linesV[i2];
            let frac = this.mm2frac(mm);
            frac = frac[dimH];
            let left = this.frac2mm([frac, fracY, 0]);
            left = swizzleVec3(left, [0, 2, 1]);
            let right = this.frac2mm([frac, fracY, 1]);
            right = swizzleVec3(right, [0, 2, 1]);
            left = mm2screen(left);
            right = mm2screen(right);
            this.drawLine([left[0], left[1], right[0], right[1]], thick);
        }
    }
    if (linesV.length > 0 && axCorSag === 2) {
        const fracX = sliceFrac;
        const dimH = 1;
        for (let i2 = 0; i2 < linesV.length; i2++) {
            const mm = this.frac2mm([0.5, 0.5, 0.5]);
            mm[dimH] = linesV[i2];
            let frac = this.mm2frac(mm);
            frac = frac[dimH];
            let left = this.frac2mm([fracX, frac, 0]);
            left = swizzleVec3(left, [1, 2, 0]);
            let right = this.frac2mm([fracX, frac, 1]);
            right = swizzleVec3(right, [1, 2, 0]);
            left = mm2screen(left);
            right = mm2screen(right);
            this.drawLine([left[0], left[1], right[0], right[1]], thick);
        }
    }
}


// not included in public docs
// Niivue.prototype.drawCrosshairs3D=function(isDepthTest = true, alpha = 1, mvpMtx = null, is2DView = false, isSliceMM = true) {
//     console.log('method called');
//     if (!this.opts.show3Dcrosshair && !is2DView) {
//         return;
//     }
//     if (this.opts.crosshairWidth <= 0 && is2DView) {
//         return;
//     }
//     const gl = this.gl;
//     const mm = this.frac2mm(this.scene.crosshairPos, 0, isSliceMM);
//     if (this.crosshairs3D === null || this.crosshairs3D.mm[0] !== mm[0] || this.crosshairs3D.mm[1] !== mm[1] || this.crosshairs3D.mm[2] !== mm[2]) {
//         if (this.crosshairs3D !== null) {
//             gl.deleteBuffer(this.crosshairs3D.indexBuffer);
//             gl.deleteBuffer(this.crosshairs3D.vertexBuffer);
//         }
//         const [mn, mx, range] = this.sceneExtentsMinMax(isSliceMM);
//         let radius = 1;
//         if (this.volumes.length > 0) {
//             radius = 0.5 * Math.min(Math.min(this.back.pixDims[1], this.back.pixDims[2]), this.back.pixDims[3]);
//         } else if (range[0] < 50 || range[0] > 1e3) {
//             radius = range[0] * 0.02;
//         }
//         radius *= this.opts.crosshairWidth;
//         this.crosshairs3D = NiivueObject3D.generateCrosshairs(this.gl, 1, mm, mn, mx, radius);
//         this.crosshairs3D.mm = mm;
//     }
//     const crosshairsShader = this.surfaceShader;
//     crosshairsShader.use(this.gl);
//     if (mvpMtx === null) {
//         ;
//         [mvpMtx] = this.calculateMvpMatrix(this.crosshairs3D, this.scene.renderAzimuth, this.scene.renderElevation);
//     }
//     gl.uniformMatrix4fv(crosshairsShader.mvpLoc, false, mvpMtx);
//     gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.crosshairs3D.indexBuffer);
//     gl.enable(gl.DEPTH_TEST);
//     const color = [...this.opts.crosshairColor];
//     if (isDepthTest) {
//         gl.disable(gl.BLEND);
//         gl.depthFunc(gl.GREATER);
//     } else {
//         gl.enable(gl.BLEND);
//         gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
//         gl.depthFunc(gl.ALWAYS);
//     }
//     color[3] = alpha;
//     gl.uniform4fv(crosshairsShader.colorLoc, color);
//     gl.bindVertexArray(this.crosshairs3D.vao);
//     gl.drawElements(
//         gl.TRIANGLES,
//         this.crosshairs3D.indexCount,
//         gl.UNSIGNED_INT,
//         // gl.UNSIGNED_SHORT,
//         0
//     );
//     gl.bindVertexArray(this.unusedVAO);
// }
export { Niivue };
