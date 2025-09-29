
const isTouchDevice =
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0;
var isFilled = true;
function handleIntensityChange(data) {
  document.getElementById("intensity").innerHTML =
      "&nbsp;&nbsp;" + data.string;
}
var nv1 = new niivue.Niivue({
  logging: true,
  dragAndDropEnabled: true,
  backColor: [0, 0, 0, 1],
  show3Dcrosshair: true,
  onLocationChange: handleIntensityChange,
});
nv1.opts.isColorbar = false;
nv1.setRadiologicalConvention(false);
nv1.attachTo("gl1");
nv1.setClipPlane([0.3, 270, 0]);
nv1.setRenderAzimuthElevation(120, 10);
nv1.setSliceType(nv1.sliceTypeMultiplanar);
nv1.setSliceMM(true);
nv1.opts.multiplanarForceRender = false;
nv1.graph.autoSizeMultiplanar = true;
nv1.graph.opacity = 1.0;
nv1.drawOpacity = 0.5;
nv1.opts.isColorbar = false;
var volumeList1 = [{ url: "../images/FLAIR.nii.gz" }];
await nv1.loadVolumes(volumeList1);
await nv1.loadDrawingFromUrl("../images/lesion.nii.gz");
function toggleGroup(id) {
  let buttons = document.getElementsByClassName("viewBtn");
  let char0 = id.charAt(0);
  for (let i = 0; i < buttons.length; i++) {
    if (buttons[i].id.charAt(0) !== char0) continue;
    buttons[i].classList.remove("dropdown-item-checked");
    if (buttons[i].id === id)
      buttons[i].classList.add("dropdown-item-checked");
  }
} // toggleGroup()
async function onButtonClick(event) {
  if (isTouchDevice) {
    console.log("Touch device: click menu to close menu");
    /*var el = this.parentNode
      el.style.display = "none"
      setTimeout(function() { //close menu
        //el.style.removeProperty("display")
        //el.style.display = "block"
      }, 500)*/
  }
  if (event.target.id === "SaveDraw") {
    nv1.saveImage("draw.nii", true);
    return;
  }
  if (event.target.id === "CloseDraw") {
    nv1.closeDrawing();
    return;
  }
  if (event.target.id === "SaveBitmap") {
    nv1.saveScene("ScreenShot.png");
    return;
  }
  if (event.target.id === "ShowHeader") {
    alert(nv1.volumes[0].hdr.toFormattedString());
    return;
  }
  if (event.target.id === "Colorbar") {
    nv1.opts.isColorbar = !nv1.opts.isColorbar;
    event.srcElement.classList.toggle("dropdown-item-checked");
    nv1.drawScene();
    return;
  }
  if (event.target.id === "Radiological") {
    nv1.opts.isRadiologicalConvention = !nv1.opts.isRadiologicalConvention;
    event.srcElement.classList.toggle("dropdown-item-checked");
    nv1.drawScene();
    return;
  }
  if (event.target.id === "Crosshair") {
    nv1.opts.show3Dcrosshair = !nv1.opts.show3Dcrosshair;
    event.srcElement.classList.toggle("dropdown-item-checked");
    nv1.drawScene();
  }
  if (event.target.id === "ClipPlane") {
    if (nv1.scene.clipPlaneDepthAziElev[0] > 1)
      nv1.setClipPlane([0.3, 270, 0]);
    else nv1.setClipPlane([2, 270, 0]);
    nv1.drawScene();
    return;
  }
  if (event.target.id.charAt(0) === "!") {
    // set color scheme
    nv1.volumes[0].colormap = event.target.id.substr(1);
    nv1.updateGLVolume();
    toggleGroup(event.target.id);
    return;
  }
  if (event.target.id.charAt(0) === "{") {
    // change color labels https://github.com/niivue/niivue/issues/575
    if (event.target.id === "{$Custom") {
      let cmap = {
        R: [0, 255, 22, 127],
        G: [0, 20, 192, 187],
        B: [0, 152, 80, 255],
        A: [0, 255, 255, 255],
        labels: ["", "pink","lime","sky"],
      };
      nv1.setDrawColormap(cmap)
    } else
      nv1.setDrawColormap(event.target.id.substr(1));
    toggleGroup(event.target.id);
    return;
  }
  if (event.target.id === "Undo") {
    nv1.drawUndo();
  }
  if (event.target.id.charAt(0) === "@") {
    //sliceType
    if (event.target.id === "@Off") nv1.setDrawingEnabled(false);
    else nv1.setDrawingEnabled(true);
    if (event.target.id === "@Erase") nv1.setPenValue(0, isFilled);
    if (event.target.id === "@Red") nv1.setPenValue(1, isFilled);
    if (event.target.id === "@Green") nv1.setPenValue(2, isFilled);
    if (event.target.id === "@Blue") nv1.setPenValue(3, isFilled);
    if (event.target.id === "@Yellow") nv1.setPenValue(4, isFilled);
    if (event.target.id === "@Cyan") nv1.setPenValue(5, isFilled);
    if (event.target.id === "@Purple") nv1.setPenValue(6, isFilled);
    if (event.target.id === "@Cluster") nv1.setPenValue(-0, isFilled);
    if (event.target.id === "@GrowCluster") nv1.setPenValue(NaN, isFilled);
    if (event.target.id === "@GrowClusterBright")
      nv1.setPenValue(Number.POSITIVE_INFINITY, isFilled);
    if (event.target.id === "@GrowClusterDark")
      nv1.setPenValue(Number.NEGATIVE_INFINITY, isFilled);
    toggleGroup(event.target.id);
  } //Draw Color
  if (event.target.id === "Growcut") nv1.drawGrowCut();
  if (event.target.id === "Translucent") {
    if (nv1.drawOpacity > 0.75) nv1.drawOpacity = 0.5;
    else nv1.drawOpacity = 1.0;
    nv1.drawScene();
    event.srcElement.classList.toggle("dropdown-item-checked");
    return;
  }
  if (event.target.id === "DrawOtsu") {
    let levels = parseInt(prompt("Segmentation classes (2..4)", "3"));
    nv1.drawOtsu(levels);
  }
  if (event.target.id === "RemoveHaze") {
    let level = parseInt(prompt("Remove Haze (1..5)", "5"));
    nv1.removeHaze(level);
  }
  if (event.target.id === "DrawFilled") {
    isFilled = !isFilled;
    nv1.setPenValue(nv1.opts.penValue, isFilled);
    event.srcElement.classList.toggle("dropdown-item-checked");
    return;
  }
  if (event.target.id === "DrawOverwrite") {
    nv1.drawFillOverwrites = !nv1.drawFillOverwrites;
    event.srcElement.classList.toggle("dropdown-item-checked");
    return;
  }
  if (event.target.id.charAt(0) === "|") {
    //sliceType
    if (event.target.id === "|Axial") nv1.setSliceType(nv1.sliceTypeAxial);
    if (event.target.id === "|Coronal")
      nv1.setSliceType(nv1.sliceTypeCoronal);
    if (event.target.id === "|Sagittal")
      nv1.setSliceType(nv1.sliceTypeSagittal);
    if (event.target.id === "|Render") nv1.setSliceType(nv1.sliceTypeRender);
    if (event.target.id === "|MultiPlanar") {
      nv1.opts.multiplanarForceRender = false;
      nv1.setSliceType(nv1.sliceTypeMultiplanar);
    }
    if (event.target.id === "|MultiPlanarRender") {
      nv1.opts.multiplanarForceRender = true;
      nv1.setSliceType(nv1.sliceTypeMultiplanar);
    }
    toggleGroup(event.target.id);
  } //sliceType
  if (event.target.id === "WorldSpace") {
    nv1.setSliceMM(!nv1.opts.isSliceMM);
    event.srcElement.classList.toggle("dropdown-item-checked");
    return;
  }
  if (event.target.id === "Interpolate") {
    nv1.setInterpolation(!nv1.opts.isNearestInterpolation);
    event.srcElement.classList.toggle("dropdown-item-checked");
    return;
  }
  if (event.target.id === "Left") nv1.moveCrosshairInVox(-1, 0, 0);
  if (event.target.id === "Right") nv1.moveCrosshairInVox(1, 0, 0);
  if (event.target.id === "Posterior") nv1.moveCrosshairInVox(0, -1, 0);
  if (event.target.id === "Anterior") nv1.moveCrosshairInVox(0, 1, 0);
  if (event.target.id === "Inferior") nv1.moveCrosshairInVox(0, 0, -1);
  if (event.target.id === "Superior") nv1.moveCrosshairInVox(0, 0, 1);
  if (event.target.id === "BackColor") {
    if (nv1.opts.backColor[0] < 0.5) nv1.opts.backColor = [1, 1, 1, 1];
    else nv1.opts.backColor = [0, 0, 0, 1];
    nv1.drawScene();
    event.srcElement.classList.toggle("dropdown-item-checked");
    return;
  }
  if (event.target.id.charAt(0) === "^") {
    //drag mode
    let s = event.target.id.substr(1);
    switch (s) {
      case "none":
        nv1.opts.dragMode = nv1.dragModes.none;
        break;
      case "contrast":
        nv1.opts.dragMode = nv1.dragModes.contrast;
        break;
      case "measurement":
        nv1.opts.dragMode = nv1.dragModes.measurement;
        break;
      case "pan":
        nv1.opts.dragMode = nv1.dragModes.pan;
        break;
    }
    toggleGroup(event.target.id);
  } //drag mode
  if (event.target.id === "_mesh") {
    volumeList1[0].url = "../images/mni152.nii.gz";
    await nv1.loadVolumes(volumeList1);
    nv1.loadMeshes([
      {
        url: "../images/BrainMesh_ICBM152.lh.mz3",
        rgba255: [200, 162, 255, 255],
      },
      { url: "../images/dpsv.trx", rgba255: [255, 255, 255, 255] },
    ]);
    toggleGroup(event.target.id);
  } else if (event.target.id.charAt(0) === "_") {
    //example image
    nv1.meshes = []; //close open meshes
    let root = "../images/";
    let s = event.target.id.substr(1);
    let img = root + s + ".nii.gz";
    console.log("Loading " + img);
    volumeList1[0].url = img;
    nv1.loadVolumes(volumeList1);
    toggleGroup(event.target.id);
    nv1.updateGLVolume();
  } //example image
} // onButtonClick()
var buttons = document.getElementsByClassName("viewBtn");
for (let i = 0; i < buttons.length; i++)
  buttons[i].addEventListener("click", onButtonClick, false);
