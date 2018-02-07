document.addEventListener("load", function(){
    var decoder = new _qrdecoder('outcanvas', 240, 180);
    decoder.start()
    .then(function(data){
        console.log(data);
    });   
    document.getElementById("button").onclick = decoder.switch;
});
