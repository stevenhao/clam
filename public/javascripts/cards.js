myPid = 0;
animationCount = 0;

window.onload = function() {
  console.log('cards.js is alive.');
  render();
  $('.myButton').click(function() {
    startAnimation(400, 100);
  });
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
      for (var idx = 0; idx < position; ++idx) {
        setImage(idx, cards[position - idx] + '.jpg');
      }
      ++position;
      setTimeout(animate, timeout);
    }, flash);
  }

  animate();
}

print = console.log.bind(console);

setImage = function(idx, path) {
  $('.cardholder' + idx).attr('src', "images/"+path);
}

clearImage = function(path) {
  $('.cardholder').attr('src', "images/blank.jpg");
}

render = function() {
  setImage(0, 'Blue_Back.jpg');
  var wdth = 200;
  var hght = 300;
  var container = $('#container');
  container.html('');
  for(var idx = 0; idx < 20; ++idx) {
    var img = $('<img/>').addClass('cardholder' + idx).attr('width', wdth + 'px').attr('height', hght + 'px');
    wdth *= .8;
    hght *= .8;
    container.append(img);
  }
}
