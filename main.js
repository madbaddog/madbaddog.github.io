var decoder = new _getqrdecoder('outcanvas', 240, 180);
decoder.start()
.then(function(data){
    console.log(data);
});   
function switchCam(){
    decoder.switchCamera();
}
