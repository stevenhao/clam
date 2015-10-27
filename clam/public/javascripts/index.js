myPid = 0;

window.onload = function() {
  socket = io();
  console.log('index.js is alive.');
  socket.on('register success', function(_gameInfo) {
    console.log('register success!');
    gameInfo = _gameInfo;
    render();
  });

  $('form').submit(function(){
    print('submit');
    myPid = parseInt($('input[name=pid]:checked').val());

    socket.emit('register', myPid);
    return false;
  });
};

// public_info is a thing

print = console.log.bind(console);

render = function() {
  console.log('rendering, myPid = ', myPid);
  fillHand = function(hand, cards, pid) {
    print('fill hand: ', hand, cards, pid);
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
        cardEl.append($('<div class="value certain">').append(rank));
      }
      else {
        cardEl.append($('<div class="value uncertain">').append("?"));
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

    setName = function(nametag, name, pid) {
      print('set name: ', nametag, name);
      nametag.html(name);
    }
  }

  // until david implements this
  gameInfo.public.names = ['Player 1', 'Player 2', 'Player 3', 'Player 4'];

  turn = gameInfo.public.turn;
  handEls = [$('.hand.bottom'), $('.hand.left'), $('.hand.top'), $('.hand.right')];
  nameEls = [$('.name.bottom'), $('.name.left'), $('.name.top'), $('.name.right')];
  print('myPid:' ,myPid);
  for(var idx = 0; idx < 4; ++idx) {
    print("myPid, idx, myPid+idx", myPid, idx, myPid+idx);
    oth = (myPid + idx) % 4;
    print ('oth=', oth);
    fillHand(handEls[idx], gameInfo.private[oth], oth);
    setName(nameEls[idx], gameInfo.public.names[oth], oth);
    if (turn == (myPid + idx) % 4) {
      nameEls[idx].addClass('highlighted');
    } else {
      nameEls[idx].removeClass('highlighted');
    }
  }

  $('#status').html(gameInfo.public.names[turn] + ' to play');
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