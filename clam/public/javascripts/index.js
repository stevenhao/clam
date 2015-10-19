myPid = 1;

window.onload = function() {
  socket = io();
  console.log('index.js is alive.');
  socket.on('register success', function(_gameInfo) {
    console.log('register success!');
    gameInfo = _gameInfo;
    render();
  });

  socket.emit('pid', myPid);
};

// public_info is a thing

print = console.log.bind(console);

render = function() {
  console.log('rendering.');
  fillHand = function(hand, cards, pid) {
    print('fill hand: ', hand, cards);
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

    for (var idx = 0; idx < cards.length; ++idx) {
      var card = cards[idx];
      var color = card.color;
      var rank = card.rank;

      var cardEl = $('<div>');
      if (rank) {
        cardEl.append($('<div class="value">').append(rank));
      }
      else {
        cardEl.append($('<div contentEditable="true" class="value">').append("?"));
      }
      cardEl.addClass('card');
      var col = color == 1 ? 'black' : 'red';
      cardEl.addClass(col);
      cardEl.attr('id', pid + '' + idx);
      cardEl.click(function(p, i) {
        return function() {
          print('clicked card', p, i);
          selectCard({'idx': i, 'pid': p});
        }
      }(pid, idx));
      addCard(cardEl);
    }

    if (orientation == 'vertical') {
      hand.append(row);
    }
  }

  turn = gameInfo.public.turn;
  handEls = [$('.hand.bottom'), $('.hand.left'), $('.hand.top'), $('.hand.right')];
  for(var idx = 0; idx < 4; ++idx) {
    oth = (myPid + idx) % 4;
    fillHand(handEls[idx], gameInfo.private[oth], oth);
    if (turn == (myPid + idx) % 4) {
      handEls[idx].addClass('highlighted');
    }
  }

  $('#status').html('Player ' + (turn + 1) + ' to play');
}

selectedCard = null
selectCard = function(card) {
  console.log('select card', card);
  if (selectedCard) {
    $('#' + selectedCard.pid + '' + selectedCard.idx).removeClass('selected');
  }
  if (selectedCard != null && selectedCard.idx == card.idx && selectedCard.pid ==  card.pid) {
    selectedCard = null;
  } else {
    selectedCard = card;
    var el = $('#' + selectedCard.pid + '' + selectedCard.idx);
    print(el);
    el.addClass('selected');
  }
}

$('.view').html('Hi');