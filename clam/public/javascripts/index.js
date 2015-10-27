myPid = 0;
selectedCard = null

window.onload = function() {
  socket = io();
  console.log('index.js is alive.');
  socket.on('register success', function(_gameInfo) {
    console.log('register success,', _gameInfo);
    gameInfo = _gameInfo;
    render();
  });


  $('#pidform').submit(function() {
    myPid = parseInt($('input[name=pid]:checked').val());
    socket.emit('register', myPid, 0);
    print('playing as pid', myPid);
    return false;
  });

  $('#goform').submit(function() {
    // pass, guess, flip
    try {
    if (selectedCard == null) {
      print('WHAT CARD DUDE');
      return false;
    }

    if (myPid != getNextAction()) {
      print('NOT YOUR TURN BRO!');
      return false;
    }

    var phase = gameInfo.public.phase;
    if (phase == 'pass') {
      if (selectedCard.pid != myPid) {
        print('PASS YOUR CARD DUDE');
        return false;
      }
      socket.emit('pass', {'card': selectedCard.idx});
    } else if (phase == 'guess') {
      var rank = 1;
      var guessObj = {'target_id': selectedCard.pid, 'target_card': selectedCard.idx, 'rank': rank};
      socket.emit('guess', guessObj);
    } else if (phase == 'flip') {
      if (selectedCard.pid != myPid) {
        print('FLIP YOUR CARD DUDE');
        return false;
      }
      socket.emit('flip', {'card': selectedCard.idx});
    }

  }
    catch(e) {
      print('exception', e);
    }

    update();
    return false;
  });

  socket.on('gameList', function(list) {
    renderGameList(list);
  });
  socket.emit('getGames');
};

<<<<<<< HEAD
function update() {
  socket.emit('pid', myPid);
}

function partner(x) {
  return (x + 2) % 4;
}

function getNextAction() {
  try {
  print('getting next action.');
  var turn = gameInfo.public.turn;
  var phase = gameInfo.public.phase;
  if (phase == 'pass') {
    return partner(turn);
  } else if (phase == 'guess') {
    return turn;
  } else if (phase == 'flip') {
    return turn;
  }}
  catch(e){
    print('exception', e);
  }
}
=======
renderGameList = function(list) {
  var gidform = $('#gidform');
  list.append('New');
  for (var i = 0; i < list.length; ++i) {
    gid = list[i];
    var el = $('<input type="radio" name="gid" value="' + gid + '">').append(gid);
    gidform.append(el);
  }
}
// public_info is a thing
>>>>>>> WIP

print = console.log.bind(console);

render = function() {
  console.log('rendering, myPid = ', myPid);
  fillHand = function(hand, cards, pid) {
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
          selectCard({'idx': i, 'pid': p});
        }
      }(pid, idx));
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
  gameInfo.public.names = ['Player 1', 'Player 2', 'Player 3', 'Player 4'];

  turn = gameInfo.public.turn;
  handEls = [$('.hand.bottom'), $('.hand.left'), $('.hand.top'), $('.hand.right')];
  nameEls = [$('.name.bottom'), $('.name.left'), $('.name.top'), $('.name.right')];
  for(var idx = 0; idx < 4; ++idx) {
    oth = (myPid + idx) % 4;
    fillHand(handEls[idx], gameInfo.private[oth], oth);
    setName(nameEls[idx], gameInfo.public.names[oth], oth);
    if (turn == (myPid + idx) % 4) {
      nameEls[idx].addClass('highlighted');
    } else {
      nameEls[idx].removeClass('highlighted');
    }
  }

  $('#status').html(gameInfo.public.names[turn] + ' to play<br>'
    + gameInfo.public.names[getNextAction()] + ' to ' + gameInfo.public.phase);
}

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
    el.addClass('selected');
  }
}
