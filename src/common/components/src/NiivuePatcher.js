/**
 * This method patches the original NiiVue library to produce customized behaviors and effects.
 */
import {Niivue} from "@niivue/niivue";

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
                this.draw2D([ltwh[0]+px, ltwh[1] + sZ + pad+pz*2+py, sX, sY], 0);
                //draw coronal
                this.draw2D([ltwh[0]+px, ltwh[1]+pz, sX, sZ], 1);
                //draw sagittal
                this.draw2D([ltwh[0] + sX + pad+px*2+py, ltwh[1]+pz, sY, sZ], 2);
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
    console.log(penBounds);
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

export {Niivue};