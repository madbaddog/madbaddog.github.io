window.onload = function(){    
    var decoder = new _qrdecoder('outcanvas', 'video', 240, 180);
    if (decoder.checkConstraints())
    decoder.start()
    .then(function(data){
        console.log(data);
    });   
};
