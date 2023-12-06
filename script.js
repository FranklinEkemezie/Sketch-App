"use strict";
/* ---------------------------------------
# Selecting HTML Elements
---------------------------------------- */
const select = (selectors, all=false) => {
  let result = document.querySelectorAll(selectors);
  return all ? [...result] : result[0];
};
const on = (event, element, eventHandler) => element.addEventListener(event, eventHandler);
const ons = (element, eventList) => eventList.forEach(eventOption => element.addEventListener(eventOption["event"], eventOption["handler"]));

// Select elements
const canvas = document.getElementById("canvas");
const colour_palettes = select(".nav .colour-palettes span", true);
const clear_btn = select(".nav .buttons .clear-btn");
const save_btn = select(".nav .buttons .save-btn");
const erase_btn = select(".nav .buttons .erase-btn");
const background_color_input = select(".nav .settings .background-color-input");
const line_weight_input = select(".nav .settings .line-weight-input");
const line_weight_output = select(".nav .settings .line-weight-output");
const colour_palette_icon = select(".nav .icon");
const horizontal_ruler = select(".rulers .horizontal");
const vertical_ruler = select(".rulers .vertical");
const horizontal_marker = select(".rulers .horizontal .marker");
const vertical_marker = select(".rulers .vertical .marker");
const unit_display = select(".rulers .unit-display");
const position_display = select(".rulers .position-display");

/* ---------------------------------------
# Declaring Variables
---------------------------------------- */
const CANVAS = {
  canvas, 
  offsetX: this.canvas.offsetLeft,
  offsetY: this.canvas.offsetTop,
  mousedown: false,
  prevX: null,
  prevY: null,
  erase: false, //checks if the eraser is clicked
  unit: null, 
}

const CONTEXT = {
  ctx: CANVAS.canvas.getContext("2d"),
  stroke_width: line_weight_input.value,
  stroke_color: null,
}

/* ---------------------------------------
# Functions
----------------------------------------- */
const generateRandomHex = () => Array(3).fill(3).map(e => e = parseInt(Math.random() * 256).toString(16)).map(e => e.length === 1 ? "0" + e : e).join("");
const active = (element) => element.classList.toggle("active");
const setCanvasBackground = (value) => canvas.style.backgroundColor = value;
const displayLineWeight = (value) => line_weight_output.innerHTML = value;
const setStrokeWidth = (value) => displayLineWeight(CONTEXT.ctx.lineWidth = value);
const setStrokeStyle = (colour_palette) => CONTEXT.ctx.strokeStyle = colour_palette.dataset.colour;
const clearScreen = () => CONTEXT.ctx.clearRect(CANVAS.offsetX, CANVAS.offsetY, CANVAS.width, CANVAS.height);

function setDefaults(resize=false) {
  // Set Canvas height and width
  CANVAS.height = canvas.height = window.innerHeight - 24;
  CANVAS.width = canvas.width = window.innerWidth - 24;

  // Calibrate Rulers
  calibrateRuler(horizontal_ruler);
  calibrateRuler(vertical_ruler);

  // Set the default line weight
  setStrokeWidth(line_weight_input.value);

  // If the window was resized, just reset the canvas dimensions and set stroke width
  if(resize) return;

  // Change the value of the background input, set canvas background color
  setCanvasBackground(background_color_input.value = `#${generateRandomHex()}`);

  // Display the colour palettes
  colour_palettes.forEach(colour_palette => colour_palette.style.setProperty("--background-color", colour_palette.dataset.colour));
  colour_palettes[0].click();

  // Check to display info box: will be displayed if 'display_info_box' is false
  if(window.localStorage) {
    let display_info_box = localStorage.getItem("display_info_box");

    if(display_info_box === null || display_info_box === 'true') displayInfoBox();
  }
}

function handleColourPaletteClick(colour_palette) {
  // Add the active state
  let siblings = [...colour_palette.parentElement.children].filter(el => el !== colour_palette);
  siblings.forEach(siblingEl => siblingEl.classList.contains("active") ? active(siblingEl) : null);

  active(colour_palette);
  setStrokeStyle(colour_palette);
}

function unitConverter(value, from, to) {
  // Supported units: inches(in), centimetres(cm), millimetres(mm) using pixels as the base unit
  let units = {
    "px": 1,
    "in": 96,
    "cm": (96 / 2.54),
    "mm": (96 / 25.4)
  }
  value *= units[from]; // Convert to central unit: pixels
  value /= units[to]; //Convert to final unit
  return value;
}

function calibrateRuler(ruler, unit='in') {
  // Supported units: inches, centimetres, and millimetres
  if(ruler.children.length > 1) {
    // Clear all markers
    Array.from(ruler.children).filter(child => child.classList.contains("mark")).forEach(child => ruler.removeChild(child));
  };

  // Check how many whole units will fit in for each the ruler dimension
  let ruler_length = ruler.clientWidth - CANVAS.offsetX;
  ruler_length = unitConverter(ruler_length, 'px', unit); // express in the specified units
  let max_unit = Math.floor(ruler_length); // round down to the nearest whole number

  let counter = 0;
  while (counter < max_unit) {
    let cal = document.createElement("span"); // Create a new calibration
    cal.classList.add("mark");
    cal.style.width = `${parseInt(ruler_length / max_unit)}${unit}`;
    cal.innerHTML = ++counter;
    ruler.appendChild(cal);
  }
  unit_display.innerHTML = CANVAS.unit = unit;
}

function updateMarkers(event) {
  let currentX = event.clientX - CANVAS.offsetX;
  let currentY = event.clientY;

  horizontal_marker.style.setProperty("--left", `${currentX}px`);
  vertical_marker.style.setProperty("--left", `${CANVAS.height - currentY}px`);

  let position = [currentX, CANVAS.height - currentY].map(pos => unitConverter(pos, 'px', CANVAS.unit).toPrecision(3));
  position_display.innerHTML = `${position}`;
}

function draw(event) {
  let currentX = event.clientX - CANVAS.offsetX;
  let currentY = event.clientY - CANVAS.offsetY;
  if(CANVAS.prevX === null || CANVAS.prevY === null || !CANVAS.mousedown) {
    CANVAS.prevX = currentX;
    CANVAS.prevY = currentY;
    return;
  }

  // If erase is activated, erase
  if(CANVAS.erase) return CONTEXT.ctx.clearRect(currentX, currentY, 24, 24);

  if(event.ctrlKey) {
    currentX = CANVAS.prevX; // Enable horizontal line drawing
  } else if(event.shiftKey) {
    currentY = CANVAS.prevY; // Enable vertical line drawing
  }

  CONTEXT.ctx.beginPath();
  CONTEXT.ctx.moveTo(CANVAS.prevX, CANVAS.prevY);
  CONTEXT.ctx.lineTo(currentX, currentY);
  CONTEXT.ctx.stroke();

  CANVAS.prevX = currentX;
  CANVAS.prevY = currentY;
}

function erase(event) {
  CANVAS.erase = CANVAS.erase ? false : true;
  active(event.target);
}

function toggleUnit() {
  let units = ['in', 'cm'];
  let next_unit = units[(units.indexOf(CANVAS.unit) + 1) % units.length];

  calibrateRuler(horizontal_ruler, next_unit);
  calibrateRuler(vertical_ruler, next_unit);
}

function downloadImage() {
  let dataURL = canvas.toDataURL("");
  let dummy_link = document.createElement("a");
  dummy_link.href = dataURL;
  dummy_link.download = "sketch.png";
  dummy_link.click();
}

function displayInfoBox() {
  let info_box_container = select(".info-box-container");
  let info_box = select(".info-box-container .info-box");
  let info_check_box = select(".info-box-container .info-box input[type=checkbox]");
  let info_close_btn = select(".info-box-container .info-box button");

  info_box_container.classList.add("show"); // display the info box

  let animation_options = {
    duration: 400,
    fill: 'forwards',
    easing: 'ease'
  }

  info_box_container.animate(
    [
      {backgroundColor: "rgba(0, 0, 0, 0)"},
      {backgroundColor: "rgba(0, 0, 0, 0.4)"}
    ], animation_options
  );

  info_box.animate(
    [
      {transform: "scale(0.4)"},
      {transform: "scale(1)"}
    ], animation_options
  );

  // Closing the info box
  info_close_btn.onclick = () => info_box_container.classList.remove("show");
  info_box_container.addEventListener("click", (event) => event.target === info_box_container ? info_box_container.classList.remove("show") : null);

  // Check the box and display the info box
  let display_info_box = localStorage.getItem("display_info_box");
  display_info_box === null || display_info_box === 'true' ? info_check_box.setAttribute("checked", true) : info_check_box.removeAttribute("checked");
  on("input", info_check_box, (event) => localStorage.setItem("display_info_box", event.target.checked))
}

/* ---------------------------------------
# Adding eventlisteners
---------------------------------------- */
// Window event listener
ons(window, [
  {event: "load", handler: () => setDefaults()},
  {event: "resize", handler: () => setDefaults(true)}
]);

colour_palettes.forEach(colour_palette => on("click", colour_palette, (event) => handleColourPaletteClick(colour_palette)));
on("click", clear_btn, clearScreen);
on("click", erase_btn, erase);
on("input", background_color_input, (event) => setCanvasBackground(event.target.value));
on("input", line_weight_input, (event) => setStrokeWidth(event.target.value));
on("click", colour_palette_icon, displayInfoBox);
on("click", unit_display, toggleUnit);
on("click", save_btn, downloadImage);

// Canvas event listeners
ons(canvas, [
  {event: "mousedown", handler: () => CANVAS.mousedown = true},
  {event: "mouseup", handler: () => CANVAS.mousedown = false},
  {event: "mouseleave", handler: () => CANVAS.mousedown = false},
  {event: "mousemove", handler: (event) => draw(event)},
  {event: "mousemove", handler: (event) => updateMarkers(event)}
]);