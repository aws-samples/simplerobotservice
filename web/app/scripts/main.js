
/*
Copyright 2014-2015 Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at

    http://aws.amazon.com/apache2.0/

or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

Note: Other license terms may apply to certain, identified software files contained within or
distributed with the accompanying software if such terms are included in the directory containing
the accompanying software. Such other license terms will then apply in lieu of the terms of the
software license above.
*/

// CHANGE TO YOUR ENDPOINT
var ENDPOINT = "<API_GATEWAY_ENDPOINT>";
var POLL_INTERVAL = 1000;
var PAUSE_INTERVAL = 10000;

// Smoothie Settings
var MILLIS_PER_PIXEL = 50;
var MAX_VAL_SCALE = 1.0;
var MIN_VAL_SCALE = 1.0;
var LINE_WIDTH = 1;
var MILLIS_PER_LINE = 400;
var VERTICAL_SECTIONS = 6;
var SMOOTHIE_SPEED = 1000;

/*
 * Timer object, counts down from 60 seconds when the arm is moved.
 */
var timer = {

  timerText: $("#timer"),
  goText: $(".go"),
  getReadyText: $(".get-ready"),
  timeoutText: $(".timeout"),
  ms: 0,
  s: 60,
  running: false,
  pause: false,
  pauseInterval: null,

  init: function() {
    this.timerText.html(this.getText());
  },
  startClock: function() {
    this.hideAll();
    this.goText.show();
    this.running = true;
  },
  hideAll: function() {
    this.goText.hide();
    this.timeoutText.hide();
    this.getReadyText.hide();
  },
  stopClock: function () {
    this.timerText.html(this.getText());
    this.hideAll();
    this.timeoutText.show();
    this.timerText.toggleClass("redbox");
    this.running = false;
    this.pause = true;
    var object = this;
    clearInterval(interval);
    setTimeout(function(){
       object.resetClock();
    }, PAUSE_INTERVAL);
  },
  getText: function() {
    var seconds = this.s.toString();
    var miliseconds = this.ms.toString()
    if (seconds.length == 1) {
      seconds = "0"+seconds;
    }
    if (miliseconds.length == 1) {
      miliseconds = miliseconds+"0";
    }
    return seconds+":"+miliseconds;
  },
  resetClock: function() {
    this.pause = false;
    this.s = 60,
    this.ms = 0,
    this.hideAll();
    this.timerText.toggleClass("redbox");
    this.timerText.html(this.getText());
    this.getReadyText.show();
  },
  decrementTimer: function (){
    this.ms = this.ms-1;
    if (this.ms==-1) {
      this.s = this.s-1;
      this.ms = 9;
      if (this.s==-1) {
        this.s = 0;
        this.ms = 0;
        this.stopClock();
      }
    }
    this.timerText.html(this.getText());
  }
}

var timeseries = {};

var colors = {
    chartgray: {
        stroke: 'rgba(60, 60, 60, 0)',
        fill: 'rgba(0, 0, 0, 0.6)'
    },
    green: {
        stroke: 'rgb(141, 232, 44)',
        fill: 'rgba(141, 232, 44, 0.4)',
        zero: 'rgba(141, 232, 44, 0)'
    },
    yellow: {
        stroke: 'rgb(232, 232, 44)',
        fill: 'rgba(232, 232, 44, 0.4)',
        zero: 'rgba(232, 232, 44, 0)'
    },
    blue: {
        stroke: 'rgb(44, 132, 232)',
        fill: 'rgba(44, 132, 232, 0.4)',
        zero: 'rgba(44, 132, 232, 0)'
    }
};

var interval = null;
var timestamp = new Date().getTime();

// Init function.
$( document ).ready(function() {
  timer.init();
  window.addEventListener("resize", resizeCanvas, false);
  resizeCanvas("");
  servo = createTimeSeriesGraph("servo");
  timeseries = { "yAxis": new TimeSeries(), "xAxis": new TimeSeries(), "zAxis": new TimeSeries() };
  addAxis('yAxis', colors.green);
  addAxis('xAxis', colors.blue);
  addAxis('zAxis', colors.yellow);
  setInterval(refresh, POLL_INTERVAL);
});

/**
 * Resizes the canvas to fit the screen.
 * @param e The event
 */
function resizeCanvas (e) {
  var myCanvas = document.getElementById("servo");
  myCanvas.width = document.documentElement.clientWidth;
  myCanvas.height = document.documentElement.clientHeight - 70;
}

/**
 * Adds an axis to the graph.
 * @param {string} name The name of the axis.
 * @param {string} color The color of the axis.
 */
function addAxis(name, color) {
  servo.addTimeSeries(timeseries[name], { strokeStyle: color.stroke, fillStyle: color.zero, lineWidth: 3 });
  $("#legend-list").append('<li><span class="legend-box" style="background:'+color.fill+'; border:'+color.stroke+' 1px solid;"></span> '+name+' Servo Movements</li>');
}

/**
 * Pull the latest data from dynamodb based on the last timestamp when data was successfully recieved.
 */
function refresh() {
     $.ajax({
       dataType : 'json',
       url: ENDPOINT,
       data: {"timestamp": timestamp},
       async: true,
       success: function(response) {
         if ($.isEmptyObject(response)) {
           console.log("Empty object");
         } else {
           if (response.length>1) {
             if (!timer.pause&&!timer.running) {
               timer.startClock();
               interval = setInterval(function(){
                  timer.decrementTimer();
               }, 100);
             }
           }
           for (var key in response) {
             if (response.hasOwnProperty(key)) {
               update(response[key].coordinates);
             }
           }

           timestamp = response[response.length-1].timestamp;
        }
       },
       error: function(xhr) {
           console.error("Could not get record data: | "+xhr);
           return null;
       }
     });
}

/**
 * Update the values
 * @param {values} values The latest coordinate values to update in the graph.
 */
function update(values) {
    //console.log(values);
    if (values===undefined) {
      console.error("No data.");
      return;
    }
    if (values.yAxis!==undefined) {
          //console.log("yAxis: ", values.yAxis);
          timeseries["yAxis"].append(Date.now(), values.yAxis);
      }
    if (values.xAxis!==undefined) {
          //console.log("Sound: ", values.xAxis);
          timeseries["xAxis"].append(Date.now(), values.xAxis);
    }
    if (values.zAxis!==undefined) {
          //console.log("Sound: ", values.xAxis);
          timeseries["zAxis"].append(Date.now(), values.zAxis);
    }
    if (values.clockwiseness!==undefined) {
          $("#clockwiseness").html(values.clockwiseness);
    }
}

/**
 * Creates a new smoothie time series graph.
 * @param {sensor} sensor The title of the sensor that you want to graph
 */
function createTimeSeriesGraph(sensor) {
    var smoothie = new SmoothieChart({ maxValue: 800, minValue: 100, millisPerPixel: MILLIS_PER_PIXEL, grid: { strokeStyle: colors.chartgray.stroke, fillStyle: colors.chartgray.fill, lineWidth: LINE_WIDTH, millisPerLine: MILLIS_PER_LINE, yAxisSections: VERTICAL_SECTIONS } });
    smoothie.streamTo(document.getElementById(sensor), SMOOTHIE_SPEED);
    return smoothie;
}
