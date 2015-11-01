myPid = 0;

window.onload = function() {
  console.log('notes.js is alive.');
  render();
};

print = console.log.bind(console);

render = function() {
  console.log('rendering, myPid = ', myPid);
  fillHand = function(hand, pid) {
    orientation = hand.hasClass('vertical') ? 'vertical' : 'horizontal';
    hand.html('');
    addCard = function(cardEl) {
      cardEl.addClass(orientation);
      if (orientation == 'vertical') {
        row.append($('<td>').append(cardEl));
      } else {
        hand.append($('<tr>').append($('<td>').append(cardEl)));
      }
    }
    var row = $('<tr>');

    for(var _idx = 0; _idx < 6; ++_idx) {
      var idx = _idx;
      var cardEl = $('<div>');
      cardEl.append($('<div class="value uncertain">').append("?"));
      cardEl.addClass('card');
      cardEl.addClass('black');
      cardEl.attr('id', pid + '' + idx);
      toggleButton = $('<button/>');
      f = function(pid, idx) {
        return function() {
          var cardEl = $('#' + pid + idx);
          if (cardEl.hasClass('black')) {
            cardEl.removeClass('black');
            cardEl.addClass('red');
          } else {
            cardEl.removeClass('red');
            cardEl.addClass('black');  
          }
        }
      }
      toggleButton.click(f(pid, idx));
      toggleButton.addClass('toggleButton');
      cardEl.append(toggleButton);
      addCard(cardEl);
    }

    if (orientation == 'vertical') {
      hand.append(row);
    }

    setName = function(nametag, name, pid) {
      nametag.html(name);
    }
  }

  // until david implements this
  names = ['Player 1', 'Player 2', 'Player 3', 'Player 4'];

  handEls = [$('.hand.bottom'), $('.hand.left'), $('.hand.top'), $('.hand.right')];
  nameEls = [$('.name.bottom'), $('.name.left'), $('.name.top'), $('.name.right')];
  for(var idx = 0; idx < 4; ++idx) {
    oth = (myPid + idx) % 4;
    fillHand(handEls[idx], oth);
    setName(nameEls[idx], names[oth], oth);
  }
}
