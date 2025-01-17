/* 

Handles dynamic elements of standard kidddraw task
Oct 9 2018 photodraw2 updates
May 31 2019 updates for use at Tsinghua University
Nov 5th 2019 changing experiment name for production run
Bria Long, bria@stanford.edu
*/

// install paper.js in current video
paper.install(window);

// Testing 

// Set global variables
var curTrial=0 // global variable, trial counter
var clickedSubmit=0; // whether an image is submitted or not
var tracing = true; //whether the user is in tracing trials or not
var maxTraceTrial = 2; //the max number of tracing trials
var numPracticeTrials = maxTraceTrial + 1; // number of tracing trials
var timeLimit=30;
var disableDrawing = false; //whether touch drawing is disabled or not

// current mode and session info
var mode = "Tsinghua";
var version =mode + "_photodraw" + "_production"; // set experiment name
var sessionId=version + Date.now().toString();
var maxTrials;
var stimList = [];
var subID = $('#subID').val();

var strokeThresh = 3; // each stroke needs to be at least this many pixels long to be sent

var stimLang = {
    "triangle": "三角形",
    "rectangle": "长方形",
    "airplane": "飞机",
    "bike": "自行车",
    "bird": "鸟",
    "car": "汽车",
    "cat": "猫",
    "chair": "椅子",
    "cup": "杯子",
    "hat": "帽子",
    "house": "房子",
    "rabbit": "兔子",
    "tree": "树",
    "watch": "手表", 
}

// all of these also have "this" before each one
var stimLangPerception = {
    "this shape": "这个形状",
    "this square": "这个正方形",
    "triangle": "这个三角形",
    "rectangle": "这个长方形",
    "airplane": "这架飞机",
    "bike": "这辆自行车",
    "bird": "这只鸟",
    "car": "这辆车",
    "cat": "这只猫",
    "chair": "这把椅子",
    "cup": "这个杯子",
    "hat": "这顶帽子",
    "house": "这座房子",
    "rabbit": "这只兔子",
    "tree": "这棵树",
    "watch": "这个手表", 
}


// INITIALIZE POUCH DB & COUCH DB
localDB = new PouchDB('tsinghua-draw-local');
localDB.info().then(console.log.bind(console)); 


function emptyLocalDB(){
    if (confirm("Do you want to delete ALL of the drawing data?")){
    if (confirm("Really??? Please be sure. This cannot be undone.")){
        localDB.destroy().then(function () {
            alert('Local database emptied.')
        }).catch(function (err) {
            alert('Local database not emptied -- something went wrong.')
        })
        }
    }
    localDB = new PouchDB('tsinghua-draw-test-2');
    localDB.info().then(console.log.bind(console)); 
};

function tryUploading(){
    // server address and database 
    var remoteDb = new PouchDB('http://138.68.25.178:5984/tsinghua-draw');

    // alert with total number of rows in localDB
    localDB.allDocs({
      include_docs: true,
      attachments: true
    }, function(err, response) {
      if (err) { return console.log(err); }
      alert("There are " +  response.total_rows + " entries in local database")
    })

    // now try to sync
    localDB.replicate.to(remoteDb, {
      live: false,
      retry: false,
    }).on('change', function (change) {
      console.log('data change', change)
      alert("Uploaded (change) " + change.docs_written +  " entries including strokes with  "+ localDB.adapter)
    }).on('error', function (err) {
      console.log('sync error', err)
      alert("Could not upload data -- check Internet connection...")
     }).on('complete', function (info) {
       console.log('Syncing complete')
       alert("Done uploading " + info.docs_written +  " entries including strokes with  "+ localDB.adapter)
       console.log(info.docs_written)
       console.log(info)
    });
}


// HELPER FUNCTIONS - GENERAL
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// shuffle
function shuffle (a)
{
    var o = [];
    for (var i=0; i < a.length; i++) {
        o[i] = a[i];
    }
    for (var j, x, i = o.length;
         i;
         j = parseInt(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
}

// HELPER FUNCTIONS - TASK SPECIFIC

// Make stimulus list function, called later
function getStimuliList(){
    // Get counterbalancing order from formula (should be 1 or 2)
    var CB = $('#CB').val();

    // tracing trials as variables for afterwards
    var trace1 = {"condition":"S","category":"this square", "video": "trace_square.mp4", "image":"images/square.png"}
    var trace2 = {"condition":"S","category":"this shape", "video": "trace_shape.mp4","image":"images/shape.png"}

    // Which validation trials are we using?
    whichValidation = getRandomInt(1, 2)
    //
    var triangle_semantic = {"condition":"S","category":"triangle", "video": "triangle.mp4"}
    var triangle_perception = {"condition":"P","category":"triangle", "image": "images_photocues/triangle.png", "audio_perception":"audio/triangle.wav" }
    var rect_semantic = {"condition":"S","category":"rectangle", "video": "rectangle.mp4"}
    var rect_perception= {"condition":"P","category":"rectangle", "image": "images_photocues/rect.png" , "audio_perception":"audio/rectangle.wav" }
  
    if (whichValidation==1){ 
        semantic_validation = triangle_semantic;
        perception_validation = rect_perception;
    }
    else if (whichValidation==2){ 
        semantic_validation = rect_semantic;
        perception_validation = triangle_perception;
    }

    // Get list of categories and shuffle them
    categories = ['airplane','bike','bird','car','cat','chair','cup','hat','house','rabbit','tree','watch'] // full list of test categories 
    categories = shuffle(categories)
    stimList = []
    halfway_index = categories.length / 2

    for(var j = 0; j < (categories.length); j++){
            this_category = categories[j]

            // if in the first six categories and CB1, semantic condition
            if (j<halfway_index && CB == 1){
                condition = 'S'
            }
            // if in the first six categories and CB1, perception condition
            else if (j>(halfway_index-1) && CB==1){
                condition = 'P'
            }
            // if in the first six categories and CB2, perception condition
            else if (j<halfway_index && CB==2){
                condition = 'P'
            }
            // if in the first six categories and CB2, semantoc condition
            else if (j>(halfway_index-1) && CB==2){
                condition = 'S'
            }
            else {
                error("Condition was entered incorrectly! Should be 1 or 2")
            }

            // Push all of the relevant info into the stimuli list; requires videos and images to be named correctly!
            stimList.push({"condition":condition, "video": this_category + ".mp4", "category": this_category, 
                "audio_perception":"audio/" + this_category + ".wav" , "image": "images_photocues/" + this_category + "_" + getRandomInt(1, 3) + ".png"});
    }
    

    if (CB==1) { // semantic first, insert perception halfway
        stimList.splice(halfway_index,0,perception_validation) // 
        stimList.unshift(semantic_validation); // 
    } else if (CB==2) {
        stimList.splice(halfway_index,0,semantic_validation) // 
        stimList.unshift(perception_validation); // 
    }

    stimList.unshift(trace2); // and tracing trial
    stimList.unshift(trace1); // and warm up trial
    maxTrials = stimList.length;
}



// for each time we start drawings
function startDrawing(){
    if (curTrial==0){
        $("#landingPage").hide();
        getStimuliList()
        beginTrial()
    }
    else if (curTrial>0 && curTrial<maxTrials) {
        if (curTrial == maxTraceTrial){
            tracing = false
            $('#sketchpad').css('background-image','');
        }
        beginTrial()
    }
    else if (curTrial==maxTrials){
        endExperiment();
    }
}


function showTaskChangeVideo(callback){

    console.log("time for something new")
    $('#photocue').hide();
    var player = loadChangeTaskVideo(); // change video
    // set volume again
    var video = document.getElementById('cueVideo');
    video.volume = 1;
    drawNext = 0;
    document.getElementById("drawingCue").innerHTML =  " &nbsp; &nbsp;  &nbsp; "
    setTimeout(function() {playVideo(player, drawNext);},1000);
};


function showTrial(){
    // Semantic trials
    if (stimList[curTrial].condition == 'S'){
        var player = loadNextVideo(curTrial); // change video

        if (tracing){
            document.getElementById("drawingCue").innerHTML =  stimLangPerception[stimList[curTrial].category]
        }
        else{
            document.getElementById("drawingCue").innerHTML = stimLang[stimList[curTrial].category] 
        }
        $('#photocue').hide();

        // set volume again
        var video = document.getElementById('cueVideo');
        video.volume = 1;
        drawNext = 1;
        setTimeout(function() {playVideo(player, drawNext);},1000);
    }
    // Perception trails
    else if (stimList[curTrial].condition == 'P'){
        document.getElementById("drawingCue").innerHTML = stimLangPerception[stimList[curTrial].category]
        $('#cueVideoDiv').hide();
        var imgPath = stimList[curTrial].image;
        $("#photocue").attr("src",imgPath);
        $('#photocue').fadeIn();
        var audio = new Audio(stimList[curTrial].audio_perception);
        audio.volume = 1;
        audio.play();
        setTimeout(
            function() {
                setUpDrawing();
            },
            6000);
    }
    else{
        alert("There is an error with the condition.");
    }
}

//
function beginTrial(){
    $('#progressBar_Button').hide();
    $('#sketchpad').hide();
    $('#mainExp').fadeIn('fast');

    // 
    if (curTrial==(halfway_index + numPracticeTrials)) {
        showTaskChangeVideo(); // in between two tasks e.g., S and P, but before validation trial for next task
    }
    else{
        showTrial();
    }
}

// video player functions
function playVideo(player, drawNext){
    player.ready(function() { // need to wait until video is ready
        $('#cueVideoDiv').fadeIn(); // show video div only after video is ready

        this.play();
        this.on('ended', function () {

            // only want to start drawing if we are not on the "something new" video
            if (drawNext == 1) {
                console.log('video ends and drawing starts');
                $('#cueVideoDiv').fadeOut(); 
                setTimeout(function(){
                    player.dispose(); //dispose the old video and related eventlistener. Add a new video
                }, 500);
                setUpDrawing();

            }
            else {
                console.log('starting normal trials...something new');
                $('#cueVideoDiv').fadeOut();
                setTimeout(function(){
                    player.dispose(); //dispose the old video and related eventlistener. Add a new video
                }, 500);

                // add slight delay between something new and start of new trials
                setTimeout(function () {
                    showTrial();
                }, 1000);
            }
        });
    });
}

function loadChangeTaskVideo(){
    $("#cueVideoDiv").html("<video id='cueVideo' class='video-js' playsinline poster='https://dummyimage.com/320x240/ffffff/fff'> </video>");
    var player=videojs('cueVideo',
        {
            "controls": false,
            "preload":"auto"
        },
        function() {
            this.volume(1);
        }
    );
    player.pause();
    player.volume(1); // set volume to max

    player.src({ type: "video/mp4", src: "videos/something_new.mp4" });
    player.load();
    return player;
}

function loadNextVideo(){
    $("#cueVideoDiv").html("<video id='cueVideo' class='video-js' playsinline poster='https://dummyimage.com/320x240/ffffff/fff' >  </video>");
    var player=videojs('cueVideo',
        {
            "controls": false,
            "preload":"auto"
        },
        function() {
            this.volume(1);
        }
    );
    player.pause();
    player.volume(1); // set volume to max
    console.log(stimList[curTrial].video)
    player.src({ type: "video/mp4", src: "videos/" + stimList[curTrial].video });
    player.load();
    return player;
}

function setUpDrawing(){
    var imgSize = "70%";
    disableDrawing = false;
    $('#sketchpad').css({"background": "", "opacity":""});

    if (tracing){
        //for all tracing trials, show the tracing image on the canvas

        var imageurl = "url('" + stimList[curTrial].image + "')";
        $('#sketchpad').css("background-image", imageurl)
            .css("background-size",imgSize)
            .css("background-repeat", "no-repeat")
            .css("background-position","center center");
        $("#endMiddle").show();
        $("#keepGoing").show();
        $("#endGame").hide();

    }else if(stimList[curTrial].category == 'this circle'){
        //for the circle trial, show the circle image for 1s and hide it.

        var imageurl = "url('" + stimList[curTrial].image + "')";
        $('#sketchpad').css("background-image", imageurl)
            .css("background-size",imgSize)
            .css("background-repeat", "no-repeat")
            .css("background-position","center center");

        setTimeout(function () {
            $('#sketchpad').css("background-image", "");
        }, 1000);

    }else if(curTrial == maxTrials-1){
        $("#endMiddle").hide();
        $("#keepGoing").hide();
        $("#endGame").show();
    }

    $('#progressBar_Button').show()
    $('#sketchpad').show()
    monitorProgress(); // since we now have a timeout function 
};

function monitorProgress(){
    clickedSubmit=0;
    startTrialTime=Date.now();
    console.log('starting monitoring')
    progress(timeLimit, timeLimit, $('.progress')); // show progress bar
    $('.progress-bar').attr('aria-valuemax',timeLimit);
    $('.progress').show(); // don't show progress bar until we start monitorung
};

//  monitoring progress spent on a trial and triggering next events
function progress(timeleft, timetotal, $element) {
    var progressBarWidth = timeleft * $element.width()/ timetotal;
    var totalBarWidth = $element.width();
    $element.find('.progress-bar').attr("aria-valuenow", timeleft).text(timeleft)
    $element.find('.progress-bar').animate({ width: progressBarWidth }, timeleft == timetotal ? 0 : 1000, "linear");
    // console.log("clicked submit = " + clickedSubmit)
    // console.log("time left = " + timeleft)

    if(timeleft > 0 & clickedSubmit==0) {
        setTimeout(function() {
            progress(timeleft - 1, timetotal, $element);
        }, 1000);
    }
    else if(timeleft == 0 & clickedSubmit==0){
        console.log("trial timed out")
        increaseTrial();
        clickedSubmit =1 // it's as if we clicked submit
        disableDrawing = true
        $('#keepGoing').addClass('bounce')
        $("#sketchpad").css({"background":"linear-gradient(#17a2b81f, #17a2b81f)", "opacity":"0.5"});
        return; //  get out of here
    }
    else if (clickedSubmit==1){
        console.log("exiting out of progress function")
        $element.find('.progress-bar').width(totalBarWidth)
        return; //  get out of here, data being saved by other button
    }
};

// saving data functions
function saveSketchData(){
    // downsamplesketchpad before saveing
    var canvas = document.getElementById("sketchpad"),
        ctx=canvas.getContext("2d");

    tmpCanvas = document.createElement("canvas");
    tmpCanvas.width=150;
    tmpCanvas.height=150;
    destCtx = tmpCanvas.getContext('2d');
    destCtx.drawImage(canvas, 0,0,150,150)

    var dataURL = tmpCanvas.toDataURL();
    dataURL = dataURL.replace('data:image/png;base64,','');
    var category = stimList[curTrial].category; // category name
    var condition = stimList[curTrial].condition; // should be S or P
    var imageName = stimList[curTrial].image; // actual image IF it was a P trial, saved in general even if not used for S trials...
    var age = $('.active').attr('id'); // age value
    var CB = $('#CB').val(); // counterbalancing (1,2)
    var whichValidation = whichValidation;
    var subID = $('#subID').val();
    var readable_date = new Date();

    current_data = {
    	_id: new Date().toISOString(), // mandatory for pouchdb
        dataType: 'finalImage',
        sessionId: sessionId, // each children's session
        imgData: dataURL,
        category: category,
        condition: condition,
        imageName: imageName,
        CB: CB,
        whichValidation: whichValidation,
        subID: subID,
        date: readable_date,
        dbname:'kiddraw',
        colname: version,
        location: mode,
        trialNum: curTrial,
        startTrialTime: startTrialTime,
        endTrialTime: Date.now()} // when trial was complete, e.g., now};
    
    // send data to local pouchdb 
	localDB.put(current_data, function callback(err, result) {
	    if (!err) {
	      console.log('localDB logged final image:');
	      console.log(current_data);
	    } else {
	      console.log('pouchDB fail!');
	      console.log(err);
          alert('failed to log local data!')
	    }
	  });
};


function restartExperiment() {
    window.location.reload(true);
}


function endExperiment(){
    curTrial = -1;
    restartExperiment()
}

function increaseTrial(){
    saveSketchData() // save first!
    curTrial=curTrial+1; // increase counter
}

function isDoubleClicked(element) {
    //if already clicked return TRUE to indicate this click is not allowed
    if (element.data("isclicked")) return true;

    //mark as clicked for 2 second
    element.data("isclicked", true);
    setTimeout(function () {
        element.removeData("isclicked");
    }, 2000);

    //return FALSE to indicate this click was allowed
    return false;
}

window.onload = function() {

    document.ontouchmove = function(event){
        event.preventDefault();
    }


    $('#startConsent').bind('touchstart mousedown',function(e) {
        e.preventDefault()

        if ($("#CB").val().trim().length==0){
                alert("Please let the researcher enter your condition.");
            }
        else if($("#CB").val().trim()!=1 && $("#CB").val().trim()!=2){
            alert("Please enter a valid counterbalancing condition (1,2)");
        }
        else{
            startDrawing();
        }
        // }
    });

    $('#keepGoing').bind('touchstart mousedown',function(e) {
        e.preventDefault()
        if (isDoubleClicked($(this))) return;

        $('#keepGoing').removeClass('bounce')

        console.log('touched next trial button');
        if(clickedSubmit==0){// if the current trial has not timed out yet
            clickedSubmit=1; // indicate that we submitted - global variable
            increaseTrial(); // save data and increase trial counter
        }

        $('#drawing').hide();
        project.activeLayer.removeChildren();
        startDrawing();
    });


    $('#upload').bind('touchstart mousedown',function(e) {
        e.preventDefault()
        if (isDoubleClicked($(this))) return;

        console.log('trying to upload data');
        tryUploading();
    });

    $('#empty_database').bind('touchstart mousedown',function(e) {
        e.preventDefault()
        if (isDoubleClicked($(this))) return;

        console.log('trying to delete database');
        emptyLocalDB();
    });


    $('.allDone').bind('touchstart mousedown',function(e) {
        saveSketchData();
        e.preventDefault()
        // if (isDoubleClicked($(this))) return;

        $('#mainExp').hide();
        $('#drawing').hide();
        $('#keepGoing').removeClass('bounce')

        console.log('touched endExperiment  button');
        if(clickedSubmit==0){// if the current trial has not timed out yet
            clickedSubmit=1; // indicate that we submitted - global variable
              // save data and increase trial counter
            endExperiment();
        }
    });

    // Set up drawing canvas
    var canvas = document.getElementById("sketchpad"),
        ctx=canvas.getContext("2d");
    //landscape mode 00 inne
    if (window.innerWidth > window.innerHeight){
        canvas.height = window.innerHeight*.68;
        canvas.width = canvas.height;
    }
    // portrait mode -- resize to height
    else if(window.innerWidth < window.innerHeight){
        canvas.height = window.innerHeight*.68;
        canvas.width = canvas.height;
    }


    /////////////  DRAWING RELATED TOOLS 
    paper.setup('sketchpad');

    
   
///////////// POUCH DB FUNCTINOS
// Each time we send a stroke...
function logStroke(path) {
	path.selected = false

	var svgString = path.exportSVG({asString: true});
	var category = stimList[curTrial].category; // category name
	var condition = stimList[curTrial].condition; // should be S or P
	var imageName = stimList[curTrial].image; // actual image IF it was a P trial, saved in general even if not used for S trials...
	var age = $('.active').attr('id'); // age value
	var CB = $('#CB').val(); // counterbalancing (1,2)
	var whichValidation = whichValidation;
	var subID = $('#subID').val();

	var readable_date = new Date();

	console.log('time since we started the trial')
	console.log(endStrokeTime - startTrialTime)
	console.log("time of this stroke")
	console.log(endStrokeTime - startStrokeTime)

  	var stroke_data = {
  			_id: new Date().toISOString(), 
            dataType: 'stroke',
            sessionId: sessionId,
            svg: svgString,
            category: category,
            condition: condition,
            imageName: imageName,
            age: age,
            CB: CB,
            whichValidation: whichValidation,
            subID: subID,
            date: readable_date,
            dbname:'kiddraw',
            colname: version,
            location: mode,
            trialNum: curTrial,
            startTrialTime: startTrialTime,
            startStrokeTime: startStrokeTime,
            endStrokeTime: endStrokeTime};

  localDB.put(stroke_data, function callback(err, result) {
    if (!err) {
      console.log('localDB logged stroke:');
      console.log(stroke_data);
    } else {
      console.log('pouchDB fail: logging trial with store.js');
      console.log(err);
      alert('failed to log local stroke data!')
    }
  });
}


///////////// TOUCH EVENT LISTENERS DEFINED HERE 

    function touchStart(ev) {
        if(disableDrawing){
            return;
        }

        startStrokeTime = Date.now()
        console.log("touch start");
        touches = ev.touches;
        if (touches.length>1){
            return; // don't do anything when simultaneous -- get out of this function
            console.log("detected multiple touches")
        }
        
        // Create new path 
        path = new Path();
        path.strokeColor = 'black';
        path.strokeCap = 'round'
        path.strokeWidth = 10;
        
        // add point to path
        var point = view.getEventPoint(ev); // should only ever be one
        path.add(point);
        view.draw();
    }

    function touchMove(ev) {
        if(disableDrawing){
            return;
        }

        // don't do anything when simultaneous touches
        var touches = ev.touches;
        if (touches.length>1){
            return; 
        }
        // add point to path
        var point = view.getEventPoint(ev); 
        path.add(point);
        view.draw();
    }

    function touchEnd(ev){
        if(disableDrawing){
            return;
        }
    // get stroke end time
        endStrokeTime = Date.now();
        console.log("touch end");  

        // simplify path
        //console.log("raw path: ", path.exportSVG({asString: true}));        
        path.simplify(3);
        path.flatten(1);
        //console.log("simpler path: ", path.exportSVG({asString: true}));

        // only send data if above some minimum stroke length threshold      
        //console.log('path length = ',path.length);
        var currStrokeLength = path.length;
        if (currStrokeLength > strokeThresh) {
            logStroke(path)
           }

    }

    targetSketch = document.getElementById("sketchpad");
    targetSketch.addEventListener('touchstart', touchStart, false);
    targetSketch.addEventListener('touchmove', touchMove, false);
    targetSketch.addEventListener('touchend', touchEnd, false);



} // on document load





