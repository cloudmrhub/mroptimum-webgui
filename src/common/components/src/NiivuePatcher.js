/**
 * This method patches the original NiiVue library to produce customized behaviors and effects.
 */
import {Niivue,NVImageFromUrlOptions,NVImage} from "@niivue/niivue";
import { mat4, vec2, vec3, vec4 } from 'gl-matrix'

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

const SLICE_TYPE = Object.freeze({
    AXIAL: 0,
    CORONAL: 1,
    SAGITTAL: 2,
    MULTIPLANAR: 3,
    RENDER: 4,
});
const DRAG_MODE = Object.freeze({
    none: 0,
    contrast: 1,
    measurement: 2,
    pan: 3,
    slicer3D: 4,
    callbackOnly: 5,
});
const MULTIPLANAR_TYPE = Object.freeze({
    AUTO: 0,
    COLUMN: 1,
    GRID: 2,
    ROW: 3,
});

const labelVisibility = {};
Niivue.prototype.getLabelVisibility = function(label){
    if(labelVisibility[label]===undefined){
        labelVisibility[label] = true;
        return true;
    }
    else{
        return labelVisibility[label];
    }
}

Niivue.prototype.setLabelVisibility = function(label, visible){
    console.log(label);
    labelVisibility[label] = visible;
    if(this.hiddenBitmap===undefined)
        this.hiddenBitmap = new Uint8Array(this.drawBitmap.length);
    if(!visible) {
        for(let i = 0; i<this.drawBitmap.length; i++){
            if(this.drawBitmap[i]===label){
                console.log(this.drawBitmap[i])
                this.hiddenBitmap[i] = label;
                this.drawBitmap[i] = 0;
            }
        }
        this.refreshDrawing(false);
    } else {
        for(let i = 0; i<this.hiddenBitmap.length; i++){
            if(this.hiddenBitmap[i]===label){
                this.hiddenBitmap[i] = 0;
                if(this.drawBitmap[i] === 0){
                    this.drawBitmap[i] = label;
                }
            }
        }
        this.refreshDrawing(false);
    }
}

// const drawAddUndoBitmap = Niivue.prototype.drawAddUndoBitmap;
// // This patching adds visibility filtering to drawings
// Niivue.prototype.drawAddUndoBitmap = async function(){
//     let resp = await drawAddUndoBitmap.call(this);
//     return resp;
// }

// This patch to closeDrawing clears invisible bitmapCache when applied
const closeDrawing = Niivue.prototype.closeDrawing;
Niivue.prototype.closeDrawing = function(){
    if(this.drawBitmap!==undefined&&this.drawBitmap!==null)
        this.hiddenBitmap = new Uint8Array(this.drawBitmap.length);
     else if(this.hiddenBitmap!==undefined)
         this.hiddenBitmap.length = 0;
    closeDrawing.call(this);
}

Niivue.prototype.drawSceneCore = function () {
    if (!this.initialized) {
        return; // do not do anything until we are initialized (init will call drawScene).
    }
    this.colorbarHeight = 0;
    this.gl.clearColor(
        this.opts.backColor[0],
        this.opts.backColor[1],
        this.opts.backColor[2],
        this.opts.backColor[3]
    );
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    //this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    if (this.bmpTexture && this.thumbnailVisible) {
        //draw the thumbnail image and exit
        this.drawThumbnail();
        return;
    }
    let posString = "";
    if (
        this.volumes.length === 0 ||
        typeof this.volumes[0].dims === "undefined"
    ) {
        if (this.meshes.length > 0) {
            this.screenSlices = []; // empty array
            this.opts.sliceType = SLICE_TYPE.RENDER; //only meshes loaded: we must use 3D render mode
            this.draw3D(); //meshes loaded but no volume
            if (this.opts.isColorbar) this.drawColorbar();
            return;
        }
        this.drawLoadingText(this.loadingText);
        return;
    }
    if (!("dims" in this.back)) return;
    if (
        this.uiData.isDragging &&
        this.scene.clipPlaneDepthAziElev[0] < 1.8 &&
        this.inRenderTile(this.uiData.dragStart[0], this.uiData.dragStart[1]) >= 0
    ) {
        //user dragging over a 3D rendering
        let x = this.uiData.dragStart[0] - this.uiData.dragEnd[0];
        let y = this.uiData.dragStart[1] - this.uiData.dragEnd[1];
        let depthAziElev = this.uiData.dragClipPlaneStartDepthAziElev.slice();
        depthAziElev[1] -= x;
        depthAziElev[1] = depthAziElev[1] % 360;
        depthAziElev[2] += y;
        if (
            depthAziElev[1] !== this.scene.clipPlaneDepthAziElev[1] ||
            depthAziElev[2] !== this.scene.clipPlaneDepthAziElev[2]
        ) {
            this.scene.clipPlaneDepthAziElev = depthAziElev;
            return this.setClipPlane(this.scene.clipPlaneDepthAziElev);
        }
    } //dragging over rendering
    if (
        this.sliceMosaicString.length < 1 &&
        this.opts.sliceType === SLICE_TYPE.RENDER
    ) {
        if (this.opts.isColorbar) this.reserveColorbarPanel();
        this.screenSlices = []; // empty array
        this.draw3D();
        if (this.opts.isColorbar) this.drawColorbar();
        return;
    }
    if (this.opts.isColorbar) this.reserveColorbarPanel();
    let maxVols = this.getMaxVols();
    let isDrawGraph =
        this.opts.sliceType === SLICE_TYPE.MULTIPLANAR &&
        maxVols > 1 &&
        this.graph.autoSizeMultiplanar &&
        this.graph.opacity > 0;

    if (this.sliceMosaicString.length > 0) {
        this.drawMosaic(this.sliceMosaicString);
    } else {
        // issue56 is use mm else use voxel
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        this.screenSlices = []; // empty array
        if (this.opts.sliceType === SLICE_TYPE.AXIAL) {
            this.draw2D([0, 0, 0, 0], 0);
        } else if (this.opts.sliceType === SLICE_TYPE.CORONAL) {
            this.draw2D([0, 0, 0, 0], 1);
        } else if (this.opts.sliceType === SLICE_TYPE.SAGITTAL) {
            this.draw2D([0, 0, 0, 0], 2);
        } else {
            //sliceTypeMultiplanar
            let isDrawPenDown =
                isFinite(this.drawPenLocation[0]) && this.opts.drawingEnabled;
            let { volScale } = this.sliceScale();
            // if (typeof this.opts.multiplanarPadPixels !== "number")
            // log.debug("multiplanarPadPixels must be numeric");
            let pad = parseFloat(this.opts.multiplanarPadPixels);
            let vScaleMax = Math.max(volScale[0], volScale[1], volScale[2]);
            // size for 2 rows, 2 columns
            let ltwh2x2 = this.scaleSlice(
                // volScale[0] + volScale[1],
                // volScale[1] + volScale[2],
                vScaleMax*2,
                vScaleMax*2,
                pad * 1,
                pad * 1
            );
            let mx = Math.max(Math.max(volScale[1], volScale[2]), volScale[0]);
            // size for 3 columns and 1 row
            let ltwh3x1 = this.scaleSlice(
                volScale[0] + volScale[0] + volScale[1],
                Math.max(volScale[1], volScale[2]),
                pad * 2
            );
            // size for 4 columns and 1 row
            let ltwh4x1 = this.scaleSlice(
                volScale[0] + volScale[0] + volScale[1] + mx,
                Math.max(volScale[1], volScale[2]),
                pad * 3
            );
            // size for 1 column * 3 rows
            let ltwh1x3 = this.scaleSlice(
                mx,
                volScale[1] + volScale[2] + volScale[2],
                0,
                pad * 2
            );
            // size for 1 column * 4 rows
            let ltwh1x4 = this.scaleSlice(
                mx,
                volScale[1] + volScale[2] + volScale[2] + mx,
                0,
                pad * 3
            );
            let isDraw3D = !isDrawPenDown && (maxVols < 2 || !isDrawGraph);
            let isDrawColumn = false;
            let isDrawGrid = false;
            let isDrawRow = false;
            if (this.opts.multiplanarLayout == MULTIPLANAR_TYPE.COLUMN)
                isDrawColumn = true;
            else if (this.opts.multiplanarLayout == MULTIPLANAR_TYPE.GRID)
                isDrawGrid = true;
            else if (this.opts.multiplanarLayout == MULTIPLANAR_TYPE.ROW)
                isDrawRow = true;
            else {
                //auto select layout based on canvas size
                if (ltwh1x3[4] > ltwh3x1[4] && ltwh1x3[4] > ltwh2x2[4])
                    isDrawColumn = true;
                else if (ltwh3x1[4] > ltwh2x2[4]) isDrawRow = true;
                else isDrawGrid = true;
            }
            if (isDrawColumn) {
                let ltwh = ltwh1x3;
                if (this.opts.multiplanarForceRender || ltwh1x4[4] >= ltwh1x3[4])
                    ltwh = ltwh1x4;
                else isDraw3D = false;
                let sX = volScale[0] * ltwh[4];
                let sY = volScale[1] * ltwh[4];
                let sZ = volScale[2] * ltwh[4];
                let sMx = mx * ltwh[4];
                //draw axial
                this.draw2D([ltwh[0], ltwh[1], sX, sY], 0);
                //draw coronal
                this.draw2D([ltwh[0], ltwh[1] + sY + pad, sX, sZ], 1);
                //draw sagittal
                this.draw2D([ltwh[0], ltwh[1] + sY + pad + sZ + pad, sY, sZ], 2);
                if (isDraw3D)
                    this.draw3D([ltwh[0], ltwh[1] + sY + sZ + sZ + pad * 3, sMx, sMx]);
            } else if (isDrawRow) {
                let ltwh = ltwh3x1;
                if (this.opts.multiplanarForceRender || ltwh4x1[4] >= ltwh3x1[4])
                    ltwh = ltwh4x1;
                else isDraw3D = false;
                let sX = volScale[0] * ltwh[4];
                let sY = volScale[1] * ltwh[4];
                let sZ = volScale[2] * ltwh[4];
                //draw axial
                this.draw2D([ltwh[0], ltwh[1], sX, sY], 0);
                //draw coronal
                this.draw2D([ltwh[0] + sX + pad, ltwh[1], sX, sZ], 1);
                //draw sagittal
                this.draw2D([ltwh[0] + sX + sX + pad * 2, ltwh[1], sY, sZ], 2);
                if (isDraw3D)
                    this.draw3D([
                        ltwh[0] + sX + sX + sY + pad * 3,
                        ltwh[1],
                        ltwh[3],
                        ltwh[3],
                    ]);
            } else if (isDrawGrid) {
                let ltwh = ltwh2x2;
                let sX = volScale[0] * ltwh[4];
                let sY = volScale[1] * ltwh[4];
                let sZ = volScale[2] * ltwh[4];
                let sS = vScaleMax*ltwh[4];
                let px = (sS-sX)/2;
                let py = (sS-sY)/2;
                let pz = (sS-sZ)/2;
                //draw axial
                this.draw2D([ltwh[0], ltwh[1] + sZ + pad+pz*2, sX, sY,sS], 0);
                //draw coronal
                this.draw2D([ltwh[0], ltwh[1], sX, sZ,sS], 1);
                //draw sagittal
                this.draw2D([ltwh[0] + sX + pad+px*2+py, ltwh[1], sY, sZ,sS], 2);
                if (isDraw3D)
                    this.draw3D([ltwh[0] + sX + pad+2*px+py, ltwh[1] + sZ + pad+2*pz+py, sY, sY]);
            } //if isDrawGrid
        } //if multiplanar
    } //if mosaic not 2D
    if (this.opts.isRuler) this.drawRuler();
    if (this.opts.isColorbar) this.drawColorbar();
    if (isDrawGraph) this.drawGraph();
    if (this.uiData.isDragging) {
        if (this.uiData.mouseButtonCenterDown) {
            this.dragForCenterButton([
                this.uiData.dragStart[0],
                this.uiData.dragStart[1],
                this.uiData.dragEnd[0],
                this.uiData.dragEnd[1],
            ]);
            return;
        }
        if (this.opts.dragMode === DRAG_MODE.slicer3D) {
            this.dragForSlicer3D([
                this.uiData.dragStart[0],
                this.uiData.dragStart[1],
                this.uiData.dragEnd[0],
                this.uiData.dragEnd[1],
            ]);
            return;
        }
        if (this.opts.dragMode === DRAG_MODE.pan) {
            this.dragForPanZoom([
                this.uiData.dragStart[0],
                this.uiData.dragStart[1],
                this.uiData.dragEnd[0],
                this.uiData.dragEnd[1],
            ]);
            return;
        }
        if (
            this.inRenderTile(this.uiData.dragStart[0], this.uiData.dragStart[1]) >= 0
        )
            return;
        if (this.opts.dragMode === DRAG_MODE.measurement) {
            //if (this.opts.isDragShowsMeasurementTool) {
            this.drawMeasurementTool([
                this.uiData.dragStart[0],
                this.uiData.dragStart[1],
                this.uiData.dragEnd[0],
                this.uiData.dragEnd[1],
            ]);
            return;
        }
        let width = Math.abs(this.uiData.dragStart[0] - this.uiData.dragEnd[0]);
        let height = Math.abs(this.uiData.dragStart[1] - this.uiData.dragEnd[1]);
        this.drawSelectionBox([
            Math.min(this.uiData.dragStart[0], this.uiData.dragEnd[0]),
            Math.min(this.uiData.dragStart[1], this.uiData.dragEnd[1]),
            width,
            height,
        ]);
    }
    const pos = this.frac2mm([
        this.scene.crosshairPos[0],
        this.scene.crosshairPos[1],
        this.scene.crosshairPos[2],
    ]);

    posString =
        pos[0].toFixed(2) + "×" + pos[1].toFixed(2) + "×" + pos[2].toFixed(2);
    this.readyForSync = true; // by the time we get here, all volumes should be loaded and ready to be drawn. We let other niivue instances know that we can now reliably sync draw calls (images are loaded)
    this.sync();
    return posString;
}; // drawSceneCore()

Niivue.prototype.draw2D = function (leftTopWidthHeight, axCorSag, customMM = NaN) {
    let frac2mmTexture = this.volumes[0].frac2mm.slice()
    let screen = this.screenFieldOfViewExtendedMM(axCorSag)
    let mesh2ortho = mat4.create()
    if (!this.opts.isSliceMM) {
        frac2mmTexture = this.volumes[0].frac2mmOrtho.slice()
        mesh2ortho = mat4.clone(this.volumes[0].mm2ortho)
        screen = this.screenFieldOfViewExtendedVox(axCorSag)
    }
    let isRadiolgical = this.opts.isRadiologicalConvention && axCorSag < SLICE_TYPE.SAGITTAL
    if (customMM === Infinity || customMM === -Infinity) {
        isRadiolgical = customMM !== Infinity
        if (axCorSag === SLICE_TYPE.CORONAL) {
            isRadiolgical = !isRadiolgical
        }
    } else if (this.opts.sagittalNoseLeft && axCorSag === SLICE_TYPE.SAGITTAL) {
        isRadiolgical = !isRadiolgical
    }
    let elevation = 0
    let azimuth = 0
    if (axCorSag === SLICE_TYPE.SAGITTAL) {
        azimuth = isRadiolgical ? 90 : -90
    } else if (axCorSag === SLICE_TYPE.CORONAL) {
        azimuth = isRadiolgical ? 180 : 0
    } else {
        azimuth = isRadiolgical ? 180 : 0
        elevation = isRadiolgical ? -90 : 90
    }
    const gl = this.gl
    if (leftTopWidthHeight[2] === 0 || leftTopWidthHeight[3] === 0) {
        // only one tile: stretch tile to fill whole screen.
        const pixPerMMw = gl.canvas.width / screen.fovMM[0]
        const pixPerMMh = gl.canvas.height / screen.fovMM[1]
        const pixPerMMmin = Math.min(pixPerMMw, pixPerMMh)
        const zoomW = pixPerMMw / pixPerMMmin
        const zoomH = pixPerMMh / pixPerMMmin
        screen.fovMM[0] *= zoomW
        screen.fovMM[1] *= zoomH
        let center = (screen.mnMM[0] + screen.mxMM[0]) * 0.5
        screen.mnMM[0] = center - screen.fovMM[0] * 0.5
        screen.mxMM[0] = center + screen.fovMM[0] * 0.5
        center = (screen.mnMM[1] + screen.mxMM[1]) * 0.5
        screen.mnMM[1] = center - screen.fovMM[1] * 0.5
        screen.mxMM[1] = center + screen.fovMM[1] * 0.5
        // screen.mnMM[0] *= zoomW;
        // screen.mxMM[0] *= zoomW;
        // screen.mnMM[1] *= zoomH;
        // screen.mxMM[1] *= zoomH;
        leftTopWidthHeight = [0, 0, gl.canvas.width, gl.canvas.height]
    }

    if (leftTopWidthHeight[4] !== undefined) {
        const mx = leftTopWidthHeight[4];
        // only one tile: stretch tile to fill whole screen.
        const pixPerMMw = mx / screen.fovMM[0]
        const pixPerMMh = mx / screen.fovMM[1]
        const pixPerMMmin = Math.min(pixPerMMw, pixPerMMh)
        const zoomW = pixPerMMw / pixPerMMmin
        const zoomH = pixPerMMh / pixPerMMmin
        screen.fovMM[0] *= zoomW
        screen.fovMM[1] *= zoomH
        let center = (screen.mnMM[0] + screen.mxMM[0]) * 0.5
        screen.mnMM[0] = center - screen.fovMM[0] * 0.5
        screen.mxMM[0] = center + screen.fovMM[0] * 0.5
        center = (screen.mnMM[1] + screen.mxMM[1]) * 0.5
        screen.mnMM[1] = center - screen.fovMM[1] * 0.5
        screen.mxMM[1] = center + screen.fovMM[1] * 0.5
        // screen.mnMM[0] *= zoomW;
        // screen.mxMM[0] *= zoomW;
        // screen.mnMM[1] *= zoomH;
        // screen.mxMM[1] *= zoomH;
        leftTopWidthHeight[2] = mx;
        leftTopWidthHeight[3] = mx;
    }
    // if (leftTopWidthHeight[2] !== leftTopWidthHeight[3]) {
    //     const mx = Math.max(leftTopWidthHeight[2],leftTopWidthHeight[3]);
    //     // only one tile: stretch tile to fill whole screen.
    //     const pixPerMMw = mx / screen.fovMM[0]
    //     const pixPerMMh = mx / screen.fovMM[1]
    //     const pixPerMMmin = Math.min(pixPerMMw, pixPerMMh)
    //     const zoomW = pixPerMMw / pixPerMMmin
    //     const zoomH = pixPerMMh / pixPerMMmin
    //     screen.fovMM[0] *= zoomW
    //     screen.fovMM[1] *= zoomH
    //     let center = (screen.mnMM[0] + screen.mxMM[0]) * 0.5
    //     screen.mnMM[0] = center - screen.fovMM[0] * 0.5
    //     screen.mxMM[0] = center + screen.fovMM[0] * 0.5
    //     center = (screen.mnMM[1] + screen.mxMM[1]) * 0.5
    //     screen.mnMM[1] = center - screen.fovMM[1] * 0.5
    //     screen.mxMM[1] = center + screen.fovMM[1] * 0.5
    //     // screen.mnMM[0] *= zoomW;
    //     // screen.mxMM[0] *= zoomW;
    //     // screen.mnMM[1] *= zoomH;
    //     // screen.mxMM[1] *= zoomH;
    //     leftTopWidthHeight[2] = mx;
    //     leftTopWidthHeight[3] = mx;
    // }
    if (isNaN(customMM)) {
        const panXY = this.swizzleVec3MM(this.scene.pan2Dxyzmm, axCorSag)
        const zoom = this.scene.pan2Dxyzmm[3]
        screen.mnMM[0] -= panXY[0]
        screen.mxMM[0] -= panXY[0]
        screen.mnMM[1] -= panXY[1]
        screen.mxMM[1] -= panXY[1]
        screen.mnMM[0] /= zoom
        screen.mxMM[0] /= zoom
        screen.mnMM[1] /= zoom
        screen.mxMM[1] /= zoom
    }

    let sliceDim = 2 // axial depth is NIfTI k dimension
    if (axCorSag === SLICE_TYPE.CORONAL) {
        sliceDim = 1
    } // sagittal depth is NIfTI j dimension
    if (axCorSag === SLICE_TYPE.SAGITTAL) {
        sliceDim = 0
    } // sagittal depth is NIfTI i dimension
    let sliceFrac = this.scene.crosshairPos[sliceDim]
    let mm = this.frac2mm(this.scene.crosshairPos)
    if (!isNaN(customMM) && customMM !== Infinity && customMM !== -Infinity) {
        mm = this.frac2mm([0.5, 0.5, 0.5])
        mm[sliceDim] = customMM
        const frac = this.mm2frac(mm)
        sliceFrac = frac[sliceDim]
    }
    const sliceMM = mm[sliceDim]
    gl.clear(gl.DEPTH_BUFFER_BIT)
    let obj = this.calculateMvpMatrix2D(
        leftTopWidthHeight,
        screen.mnMM,
        screen.mxMM,
        Infinity,
        0,
        azimuth,
        elevation,
        isRadiolgical
    )
    if (customMM === Infinity || customMM === -Infinity) {
        // draw rendering
        const ltwh = leftTopWidthHeight.slice()
        this.draw3D(
            leftTopWidthHeight,
            obj.modelViewProjectionMatrix,
            obj.modelMatrix,
            obj.normalMatrix,
            azimuth,
            elevation
        )
        const tile = this.screenSlices[this.screenSlices.length - 1]
        // tile.AxyzMxy = this.xyMM2xyzMM(axCorSag, 0.5);
        tile.leftTopWidthHeight = ltwh
        tile.axCorSag = axCorSag
        tile.sliceFrac = Infinity // use infinity to denote this is a rendering, not slice: not one depth
        tile.AxyzMxy = this.xyMM2xyzMM(axCorSag, sliceFrac)
        tile.leftTopMM = obj.leftTopMM
        tile.fovMM = obj.fovMM
        return
    }
    gl.enable(gl.DEPTH_TEST)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    // draw the slice
    gl.disable(gl.BLEND)
    gl.depthFunc(gl.GREATER)
    gl.disable(gl.CULL_FACE) // show front and back faces
    this.sliceMMShader.use(this.gl)
    gl.uniform1f(this.sliceMMShader.overlayOutlineWidthLoc, this.overlayOutlineWidth)
    gl.uniform1f(this.sliceMMShader.overlayAlphaShaderLoc, this.overlayAlphaShader)
    gl.uniform1i(this.sliceMMShader.isAlphaClipDarkLoc, this.isAlphaClipDark)
    gl.uniform1i(this.sliceMMShader.backgroundMasksOverlaysLoc, this.backgroundMasksOverlays)
    gl.uniform1f(this.sliceMMShader.drawOpacityLoc, this.drawOpacity)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    gl.uniform1f(this.sliceMMShader.opacityLoc, this.volumes[0].opacity)
    gl.uniform1i(this.sliceMMShader.axCorSagLoc, axCorSag)
    gl.uniform1f(this.sliceMMShader.sliceLoc, sliceFrac)
    gl.uniformMatrix4fv(
        this.sliceMMShader.frac2mmLoc,
        false,
        frac2mmTexture // this.volumes[0].frac2mm
    )
    gl.uniformMatrix4fv(this.sliceMMShader.mvpLoc, false, obj.modelViewProjectionMatrix.slice())
    gl.bindVertexArray(this.genericVAO) // set vertex attributes
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    gl.bindVertexArray(this.unusedVAO) // set vertex attributes
    // record screenSlices to detect mouse click positions
    this.screenSlices.push({
        leftTopWidthHeight,
        axCorSag,
        sliceFrac,
        AxyzMxy: this.xyMM2xyzMM(axCorSag, sliceFrac),
        leftTopMM: obj.leftTopMM,
        screen2frac: [],
        fovMM: obj.fovMM
    })
    if (isNaN(customMM)) {
        // draw crosshairs
        this.drawCrosshairs3D(true, 1.0, obj.modelViewProjectionMatrix, true, this.opts.isSliceMM)
    }
    if (this.opts.meshThicknessOn2D > 0.0) {
        if (this.opts.meshThicknessOn2D !== Infinity) {
            obj = this.calculateMvpMatrix2D(
                leftTopWidthHeight,
                screen.mnMM,
                screen.mxMM,
                this.opts.meshThicknessOn2D,
                sliceMM,
                azimuth,
                elevation,
                isRadiolgical
            )
        }
        // we may need to transform mesh vertices to the orthogonal voxel space
        const mx = mat4.clone(obj.modelViewProjectionMatrix)
        mat4.multiply(mx, mx, mesh2ortho)
        this.drawMesh3D(
            true,
            1,
            mx, // obj.modelViewProjectionMatrix,
            obj.modelMatrix,
            obj.normalMatrix
        )
    }
    if (isNaN(customMM)) {
        // no crossbars for mosaic view
        this.drawCrosshairs3D(false, 0.15, obj.modelViewProjectionMatrix, true, this.opts.isSliceMM)
    }
    this.drawSliceOrientationText(leftTopWidthHeight, axCorSag)
    this.readyForSync = true
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
Niivue.prototype.drawPt=function (x, y, z, penValue) {
    const penBounds = this.opts.penBounds?this.opts.penBounds:0;
    const dx = this.back.dims[1]
    const dy = this.back.dims[2]
    const dz = this.back.dims[3]
    //Sweep through cubic area, filter by radius
    for(let i = x-penBounds; i<=x+penBounds; i++){
        for(let j = y-penBounds; j<=y+penBounds; j++){
            for(let k = z-penBounds; k<=z+penBounds; k++){
                // (penBounds+1)*(penBounds) as radius filter makes better circles in discrete case
                if((i-x)*(i-x)+(j-y)*(j-y)+(k-z)*(k-z)<=(penBounds+1)*(penBounds)){
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
Niivue.prototype.drawPenFilled = function() {
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
    const penBounds = this.opts.penBounds?this.opts.penBounds:0;
    const w = penBounds*2+1; // Yuelong: paint fill with thickness
    const dims3D = [this.back.dims[h + 1], this.back.dims[v + 1], w] // +1: dims indexed from 0!
    // create bitmap of horizontal*vertical voxels:
    const img3D = new Uint8Array(dims3D[0] * dims3D[1] * dims3D[2])
    let pen = 1 // do not use this.opts.penValue, as "erase" is zero
    function drawPt3D(x,y,penValue){
        const dx = dims3D[0]
        const dy = dims3D[1]
        const dz = w
        const z = (w-1)/2;
        //Sweep through cubic area, filter by radius
        for(let i = x-penBounds; i<=x+penBounds; i++){
            for(let j = y-penBounds; j<=y+penBounds; j++){
                for(let k = z-penBounds; k<=z+penBounds; k++){
                    // (penBounds+1)*(penBounds) as radius filter makes better circles in discrete case
                    if((i-x)*(i-x)+(j-y)*(j-y)+(k-z)*(k-z)<=(penBounds+1)*(penBounds)){
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
        drawPt3D(ptA[0],ptA[1],pen);
        drawPt3D(ptB[0],ptB[1],pen);
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
                drawPt3D(x1,y1,pen);
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
                drawPt3D(x1,y1,pen);
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
        if (pt[0] < 0 || pt[1] < 0 || pt[2] < 0 || pt[0] >= dims3D[0] || pt[1] >= dims3D[1] || pt[3]>=dims3D[2]) {
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
    setSeed([0,0,0]);
    setSeed([dims3D[0]-1,0,0]);
    setSeed([0,dims3D[1]-1,0]);
    setSeed([dims3D[0]-1,dims3D[1]-1,0]);
    setSeed([0,0,dims3D[2]-1]);
    setSeed([dims3D[0]-1,0,dims3D[2]-1]);
    setSeed([0,dims3D[1]-1,dims3D[2]-1]);
    setSeed([dims3D[0]-1,dims3D[1]-1,dims3D[2]-1]);
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
    let strides = [1, this.back.dims[1],this.back.dims[1] * this.back.dims[2]];
    // xStride = s0 for axial and coronal, s1 for sagital
    let xStride = (axCorSag == 2)?strides[1]:strides[0];
    // yStride = s1 for axial, s2 for coronal and sagital
    const yStride = (axCorSag == 0)?strides[1]:strides[2];
    // zStride = s2 for axial, s1 for coronal, s0 for sagital
    const zStride = strides[2-axCorSag];
    const zOffset = slice * zStride;
    let i = 0
    for(let z = -penBounds; z<=penBounds; z++){
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
    this.drawAddUndoBitmap()
    if(this.hiddenBitmap == undefined || this.hiddenBitmap.length!=this.drawBitmap.length){
        this.hiddenBitmap = new Uint8Array(this.drawBitmap.length);
    }
    for(let i = 0; i<this.drawBitmap.length; i++){
        let pen = this.drawBitmap[i];
        if(!this.getLabelVisibility(pen)){
            this.hiddenBitmap[i] = this.drawBitmap[i];
            this.drawBitmap[i]=0;
        }
    }
    this.refreshDrawing(false)
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
Niivue.prototype.saveImageByLabels = async function(fnm, labels=[1]) {
    if (this.back.dims === undefined) {
        console.debug('No voxelwise image open')
        return false
    }
    if (!this.drawBitmap) {
        console.debug('No drawing open')
        return false
    }
    const perm = this.volumes[0].permRAS
    if (perm[0] === 1 && perm[1] === 2 && perm[2] === 3) {
        await this.volumes[0].saveToDisk(fnm, this.drawBitmap) // createEmptyDrawing
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
        // convert data

        const inVs = new Uint8Array(this.drawBitmap)
        const outVs = new Uint8Array(dims[1] * dims[2] * dims[3])
        let j = 0
        for (let z = 0; z < dims[3]; z++) {
            for (let y = 0; y < dims[2]; y++) {
                for (let x = 0; x < dims[1]; x++) {
                    let bit = inVs[xlut[x] + ylut[y] + zlut[z]]
                    //Only fill matched bits
                    outVs[j] = (labels.indexOf(bit)>=0)?bit:0
                    j++
                }
            }
        }
        await this.volumes[0].saveToDisk(fnm, outVs)
        return true
    }
}

Niivue.prototype.deleteDrawingByLabel=function(labels=[0]){
    for (let i = 0; i< this.drawBitmap.length; i++){
        this.drawBitmap[i] = (labels.indexOf(this.drawBitmap[i])<0)?this.drawBitmap[i]:0;
    }
    this.refreshDrawing(false);
}

/*
    For each spatial point, bitmap overlay tracks
    the layers of bitmaps during the grouping operation.
    For now, a single label for each voxel suffices, in future
    entries will be replaced with bit strings of the combination
    of labels
 */
const bitmapOverlay = [];

Niivue.prototype.groupLabelsInto=function(sourceLabels=[0],targetLabel = 7){
    for (let i = 0; i< this.drawBitmap.length; i++){
        if(sourceLabels.indexOf(this.drawBitmap[i])>=0){
            bitmapOverlay.push([i,this.drawBitmap[i]]);
            this.drawBitmap[i] = targetLabel;
        }
    }
    this.refreshDrawing(false);
}

Niivue.prototype.ungroup = function(){
    for(let tuple of bitmapOverlay){
        this.drawBitmap[tuple[0]] = tuple[1];
    }
    bitmapOverlay.length = 0;
    this.refreshDrawing(false);
}

Niivue.prototype.resetScene = function(){
    this.scene.pan2Dxyzmm = [0, 0, 0, 1]
    this.drawScene();
}

Niivue.prototype.relabelROIs = function(source=0, target = 0){
    for (let i = 0; i< this.drawBitmap.length; i++){
        if(this.drawBitmap[i] === source){
            this.drawBitmap[i] = target;
        }
    }
    this.refreshDrawing(true);
}

Niivue.prototype.loadDrawingFromBase64 = async function(fnm,base64) {
    if (this.drawBitmap) {
        console.debug('Overwriting open drawing!')
    }
    this.drawClearAllUndoBitmaps()
    try {
        // const volume = await NVImage.loadFromUrl()
        if (base64) {
            let imageOptions = new NVImageFromUrlOptions(fnm);
            const drawingBitmap = NVImage.loadFromBase64({name:fnm,base64})
            if (drawingBitmap) {
                this.loadDrawing(drawingBitmap)
            }
        }
    } catch (err) {
        console.error('loadDrawingFromBlob() failed to load ' + fnm)
        this.drawClearAllUndoBitmaps()
    }
    return base64!==undefined;
}

export {Niivue};