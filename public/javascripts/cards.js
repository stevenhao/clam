myPid = 0;
animationCount = 0;
window.onload = function() {
  console.log('cards.js is alive.');
  render();
  $('#animate').submit(function() {
    speed = parseInt($('input[name=speed').val())
    startAnimation(speed, 0);
    return false;
  });
  canvas = $('#tutorial')[0];
  ctx = canvas.getContext('2d');
};

getDeck = function() {
  var ranks = '23456789TJQKA';
  var suits = 'CDHS';
  var cards = [];
  for (var i = 0; i < ranks.length; ++i) {
    var rank = ranks.charAt(i);
    for (var j = 0; j < suits.length; ++j) {
      var suit = suits.charAt(j);
      var x = cards.length;
      var swp = Math.floor(x * Math.random());
      cards.push(cards[swp]);
      cards[swp] = 'card' + rank + suit;
    }
  }
  return cards;
}

startAnimation = function(timeout, flash) {
  print('starting animation');
  ++animationCount;
  var curAnimation = animationCount;
  var cards = getDeck();

  var position = 0;
  animate = function() {
    if (curAnimation != animationCount) {
      return;
    }

    clearImage();
    setTimeout(function() {
      if (position == cards.length) {
        print('done animating.');
        return;
      }
      addCard(cards[position] + '.jpg');
      ++position;
      setTimeout(animate, timeout);
    }, flash);
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  animate();
}

print = console.log.bind(console);

addCard = function(path) {
  path = "images/" + path;
  // ctx.fillStyle = "rgb(200,0,0)";
  // ctx.fillRect (10, 10, 55, 50);

  // ctx.fillStyle = "rgba(0, 0, 200, 0.5)";
  // ctx.fillRect (30, 30, 55, 50);
  var img = new Image();   // Create new img element
  img.onload = function() {
    var iw = img.width;
    var ih = img.height;
    var cw = canvas.width;
    var ch = canvas.height;
    var sc = .7;
    var rot = (Math.random() - .5) * 70;
    var cx = cw / 2;
    var cy = ch / 2;
    ctx.translate(cx, cy);
    ctx.scale(sc, sc);
    ctx.rotate(Math.PI/180 * rot);
    // ctx.translate(-cx, -cy);
    ctx.drawImage(img, -iw/2, -ih/2);
    // ctx.translate(cx, cy);
    ctx.rotate(-Math.PI/180 * rot);
    ctx.scale(1/sc, 1/sc);    
    ctx.translate(-cx, -cy);

  }
  img.src = path; // Set source path
  
}

setImage = function(idx, path) {
  $('.cardholder' + idx).attr('src', "images/"+path);
}

clearImage = function(path) {
  $('.cardholder').attr('src', "images/blank.jpg");
}

render = function() {
  setImage(0, 'Blue_Back.jpg');
  var canvas = $('#tutorial')[0];
  var ctx = canvas.getContext('2d');

}
