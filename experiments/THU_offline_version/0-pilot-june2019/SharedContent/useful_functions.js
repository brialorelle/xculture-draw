

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
