// ############################ Helper functions ##############################

// Shows slides. We're using jQuery here - the **$** is the jQuery selector function, which takes as input either a DOM element or a CSS selector string.
function showSlide(id) {
	// Hide all slides
	$(".slide").hide();
	// Show just the slide we want to show
	$("#"+id).show();
}

// Get random integers.
// When called with no arguments, it returns either 0 or 1. When called with one argument, *a*, it returns a number in {*0, 1, ..., a-1*}. When called with two arguments, *a* and *b*, returns a random value in {*a*, *a + 1*, ... , *b*}.
function random(a,b) {
	if (typeof b == "undefined") {
		a = a || 2;
		return Math.floor(Math.random()*a);
	} else {
		return Math.floor(Math.random()*(b-a+1)) + a;
	}
}

// Add a random selection function to all arrays (e.g., <code>[4,8,7].random()</code> could return 4, 8, or 7). This is useful for condition randomization.
Array.prototype.random = function() {
  return this[random(this.length)];
}

// shuffle function - from stackoverflow?
// shuffle ordering of argument array -- are we missing a parenthesis?
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

function shuffle_mult() {
    var length0 = 0,
        length = arguments.length,
        i,
        j,
        rnd,
        tmp;

    for (i = 0; i < length; i += 1) {
        if ({}.toString.call(arguments[i]) !== "[object Array]") {
            throw new TypeError("Argument is not an array.");
        }

        if (i === 0) {
            length0 = arguments[0].length;
        }

        if (length0 !== arguments[i].length) {
            throw new RangeError("Array lengths do not match.");
        }
    }


    for (i = 0; i < length0; i += 1) {
        rnd = Math.floor(Math.random() * i);
        for (j = 0; j < length; j += 1) {
            tmp = arguments[j][i];
            arguments[j][i] = arguments[j][rnd];
            arguments[j][rnd] = tmp;
        }
    }
}

// ######################## Configuration settings ############################

// connect to node.js
socket = io.connect();

//set up trials from csv
$(document).ready(function() {

$.ajax({
        type: "GET",
        url: "recognition_rating_chunks/chunk_1_compiled_dataset.csv",
        dataType: "text",
        success: function(data) {
            results = Papa.parse(data);
            imgArray = new Array();
            //set up image names
            for (i = 1; i < results.data.length-1; i++) {  // start at 1 get rid of header, end one row early to avoid empty last row (speciifc to these csvs?)
                var imageName= results.data[i][8]; 
                var imageCategory=results.data[i][3]
                imgArray[i-1] = new Image();
                imgArray[i-1].src = ['object_drawings/' + imageName];
                imgArray[i-1].name = imageCategory;
            }                       
               
    
    //global variable 
    this_version = 'batch1_production_june2021'
    //
    trials = []
    numTrialsExperiment = imgArray.length;    

    try{
        url = window.location.href
        this_sub_id = url.substring(url.lastIndexOf('PROLIFIC_PID')+13, url.lastIndexOf('PROLIFIC_PID') + 36);
        console.log(this_sub_id)
    }
    catch(err){
        this_sub_id = random(10000000000)
        console.log(this_sub_id)
    }
    
    for (i = 0; i < numTrialsExperiment; i++) {
        trial = {
            thisImageName: imgArray[i].src,
            thisImageCategory: imgArray[i].name,
            slide: "recognitionRatings",
            sub_id: this_sub_id,
        }
        trials.push(trial);
    }
    console.log(trials.length)
    
    // shuffle actual trials
    trials=shuffle(trials);
    console.log(trials.length)

}
}); // ajax 
}); // document ready

var availableTags = ["watch","bike","chair","car","tree","rabbit","house","cup","hat","cat","bird","airplane"]
$("#recognitionInput").autocomplete({
            source: availableTags,
            change: function (event, ui) {
                if(!ui.item){
                    //http://api.jqueryui.com/autocomplete/#event-change -
                    // The item selected from the menu, if any. Otherwise the property is null
                    //so clear the item for force selection
                    $("#recognitionInput").val("");
                }

            }

        });


showSlide("instructions"); // Show the instructions slide -- this is what we want subjects to see first.

// ############################## The main event ##############################
var experiment = {

	// The object to be submitted; needs to have all columns in it.
	data: {
        sub_id: [],
        guessed_category: [],
        dbname: 'devphotodraw_recognition',
        colname: 'batched_12afc', 
        imageName: [],
        trial_type: [],
		comments: [],
	},

	// end the experiment
	end: function() {
		showSlide("finished");
		setTimeout(function() {
            window.location.href="https://app.prolific.co/submissions/complete?cc=731A3666"
		}, 1500);
	},


// LOG RESPONSE
    log_response: function() {

        var response_logged = false;
        var input = document.getElementById("recognitionInput");
        var response = input.value;
        var testing = false

        // if there is something in the response, log it
        if (input && response) {
            response_logged = true;
            
            readable_date = new Date();
            trial_data =  {
                date: readable_date,
                version: this_version,
                sub_id: this_sub_id,
                dataType: 'recognition_rating',
                dbname:'devphotodraw_recognition',
                colname: 'batched_12afc', 
                guessed_category: response, 
                imageCategory: document.getElementById("imagePlaceholder").name,
                imageName: document.getElementById("imagePlaceholder").src,
            }

            $("#recognitionInput").val(""); // clear value
            socket.emit('current_data', trial_data);
            experiment.next();
        
            
        } else if (testing) {
            $("#recognitionInput").val(""); // clear value
            socket.emit('testing')
            experiment.next();
        }
        else{
            $("#testMessage_att").html('<font color="red">' + 
            'Please make a response!' + 
             '</font>');   
        }
    },
	
	// The work horse of the sequence - what to do on every trial.
	next: function() {

		// Allow experiment to start if it's a turk worker OR if it's a test run
		if (window.self == window.top) {
		$("#testMessage_att").html(''); //clear test message
		$("#testMessage_uptake").html(''); 


		$("#progress").attr("style","width:" +
			    String(100 * (1 - (trials.length)/numTrialsExperiment)) + "%")
			// Get the current trial - <code>shift()</code> removes the first element
			// select from our scales array and stop exp after we've exhausted all the domains
			var trial_info = trials.shift();

			//If the current trial is undefined, call the end function.

			if (typeof trial_info == "undefined") {
				return experiment.debriefing();
			}
            // check which trial type you're in and display correct slide
            if (trial_info.slide == "recognitionRatings") {
                document.getElementById("imagePlaceholder").name = trial_info.thisImageCategory;
                document.getElementById("imagePlaceholder").src = trial_info.thisImageName;
                showSlide("recognitionRatings"); //display slide
                
                }
		}
	},

	//	go to debriefing slide
    debriefing: function() {
        showSlide("debriefing");
    },

// submitcomments function
    submit_comments: function() {
        comments_data =  {
                date: readable_date,
                version: this_version,
                sub_id: this_sub_id,
                dataType: 'comments',
                dbname:'devphotodraw_recognition',
                colname: 'batched_12afc', 
                comments:  document.getElementById("comments").value,
            }

        socket.emit('current_data', comments_data);
        experiment.end();
    }
}

