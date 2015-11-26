var Utils = require('./utils');

// generates a new list of cards
function generateCards(num_colors, max_rank, num_players) {
  if (max_rank*num_colors % num_players != 0)
    throw 'Card numbers do not match.'

  var deck = [];
  for (i = 1; i <= num_colors; ++i)
    for (j = 1; j <= max_rank; ++j)
      deck.push({'rank':j, 'color':i});

  Utils.shuffle(deck);

  var cards = [];
  var hand_size = max_rank*num_colors/num_players;
  for (i = 0; i < num_players; ++i){
    var hand = deck.slice(hand_size*i, hand_size*(i+1));
    hand.sort(function(a, b){return a['rank'] - b['rank']});
    cards.push(hand);
  }

  return cards;
}

var Game = function() {
  var game_info, host, true_cards, phase, turn, public_gs, private_gs, sockets, usernames;
  var num_players, gid;
  init = function(_game_info, _host) {
    game_info = _game_info;
    host = host;

    num_players = game_info.num_players;
    gid = game_info.gid;

    true_cards = generateCards(game_info.num_colors, game_info.num_ranks, game_info.num_players);

    phase = game_info.has_teams?'pass':'guess';
    turn = 0;
    public_gs = {
      history: [{message:'Welcome to Clam!'}],
      winner: false
    };

    private_gs = [];
    for (var pid = 0; pid < num_players; ++pid) {
      var lst = [];
      for (var pp = 0; pp < num_players; ++pp) {
        var nlst = [];
        for(var idx = 0; idx < 6; ++idx) {
          var tcard = true_cards[pp][idx];
          nlst.push({rank: 0, color: tcard.color, visible: false, flipped: false});
        }
        lst.push(nlst);
      }
      private_gs.push(lst);
    }


    sockets = [];
    usernames = Utils.fillArray(null, num_players);

    updatePublicGS();
    updatePrivateGS();
  }

  nextTurn = function(arg) {
    var nturn = (turn + 1) % num_players;
    if (phase == 'guess') {
      var success = arg.correct_guess;
      if (success) {
        phase = 'pass';
        turn = nturn;
      } else {
        phase = 'flip';
      }
    } else if (phase == 'flip') {
      turn = nturn;
      if (game_info.has_teams) {
        phase = 'pass';
      } else {
        phase = 'guess';
      }
    } else if (phase == 'pass') {
      phase = 'guess';
    } else if (phase == 'over') {
      return;
    }
  },

  updatePublicGS = function() {
    public_gs.phase = phase;
    public_gs.turn = turn;
  }

  updatePrivateGS = function() {
    for (var pid = 0; pid < num_players; ++pid) {
      for (var pp = 0; pp < num_players; ++pp) {
        for(var idx = 0; idx < 6; ++idx) {
          var pcard = private_gs[pid][pp][idx], tcard = true_cards[pp][idx];
          pcard.visible |= pid == pp;
          pcard.flipped |= tcard.flipped;
          pcard.visible |= pcard.flipped;
          if (pcard.visible) {
            pcard.rank = tcard.rank;
            pcard.color = tcard.color;
          }
        }
      }
    }
  }

  action = function(pid, _action, args) {
    actionGuess = function(pid, guess) {
      if(!(guess instanceof Object) || !('target_id' in guess) || !('target_card' in guess) || !('rank' in guess)
        || isNaN(guess['target_id']) || isNaN(guess['target_card']) || isNaN(guess['rank'])){
        return 'invalid input';
      }

      if(phase != 'guess' || turn != pid) {
        // checks that it's player's turn
        return 'out of turn';
      }
      if(pid == guess['target_id'] || guess['target_id'] >= num_players){
        //checks that player does not target self
        return 'invalid person';
      }
      if(game_info.has_teams && (guess['target_id'] - pid)%num_players == num_players/2){
        // checks that player does not target teammate
        return 'invalid person';
      }

      var target_id = guess.target_id;
      var card = guess.target_card;
      var rank = guess.rank;

      if(card >= true_cards[target_id].length || rank > game_info.num_ranks) {
        // checks that card pos and rank are valid
        return 'invalid card';
      }

      var true_card = true_cards[target_id][card];
      if(true_card.flipped) {
        // checks that target card has not been revealed
        return 'card already revealed';
      }
      
      if(true_card.rank == rank){
        // guess is correct
        // updates public gamestate
        true_card.flipped = true;
        var message = usernames[pid]+' CORRECTLY guessed card '+(card+1)+' of '+usernames[target_id]+"'s hand as "+rank;
        // updates guess history
        public_gs['history'].push({ message: message });
        nextTurn({correct_guess: true});
      } else {
        // guess is incorrect
        var message = usernames[pid]+' INCORRECTLY guessed card '+(card+1)+' of '+usernames[target_id]+"'s hand as "+rank;
        // updates guess history
        public_gs['history'].push({ message: message });
        nextTurn({correct_guess: false});
      }

      return 'ok';
    }

    actionPass = function(pid, pass) {
      if(!(pass instanceof Object) || !('card' in pass) || isNaN(pass['card'])) {
        return 'invalid input';
      }

      if(!game_info.has_teams){
        return 'teammates off';
      }

      var passer_id = (turn+num_players/2)%num_players;
      if(public_gs['phase'] != 'pass' || passer_id != pid){
        return 'out of turn';
      }

      var card = pass['card'];
      if(card >= true_cards[pid].length) {
        return 'invalid card';
      }
      
      // updates private gamestate
      private_gs[turn][pid][card].visible = true;

      // updates pass history
      var message = usernames[pid]+' passed card '+(card+1)+' to '+usernames[public_gs['turn']];
      public_gs['history'].push({'move':'pass','id':public_gs['turn'], 'card':card, 'message':message});
      nextTurn();
      return 'ok';
    }

    actionFlip = function(pid, flip) {
      print('flip', flip);
      if(!(flip instanceof Object) || !('card' in flip) || isNaN(flip['card'])) {
        return 'invalid input';
      }

      if(public_gs['phase'] != 'flip' || public_gs['turn'] != pid){
        // checks that it's player's turn
        return 'out of turn';
      }

      var card = flip['card'];
      if(card >= true_cards[0].length) {
        // checks that card is valid
        return 'invalid card';
      }
      var true_card = true_cards[pid][card];
      if (true_card.flipped) {
        // checks that card is not already flipped
        return 'card already revealed';
      }
      
      true_card.flipped = true;

      // updates guess history
      var message = usernames[pid]+' flipped card '+(card+1);
      public_gs['history'].push({ message:message });

      nextTurn();
      return 'ok';
    }

    actionClam = function(pid, clamObj) {
      var winner = pid%2;
      for (i = 0; i < num_players; ++i){
        for (j = 0; j < true_cards[i].length; ++j){
          if(clamObj[i][j] != true_cards[i][j]['rank']){
            winner = 1 - winner;
            break;
          }
        }
        if(winner != pid%2)
          break;
      }

      phase = 'over';
      public_gs['winner'] = winner;
      var message = "";
      if(winner == pid%2){
        message = usernames[pid]+' clams successfully!\n'+usernames[pid]+' and '+usernames[(pid+2)%num_players]+' WIN :)';
      }else{
        message = usernames[pid]+' clams incorrectly!\n'+usernames[(pid+1)%num_players]+' and '+usernames[(pid+3)%num_players]+' WIN :)';
      }
      public_gs['history'].push({ message:message });

      return 'ok';
    }

    var result;
    if (phase == 'over') {
      result = 'game over';
    } else if (_action == 'guess') {
      result = actionGuess(pid, args);
    } else if (_action == 'pass') {
      result = actionPass(pid, args);
    } else if (_action == 'flip') {
      result = actionFlip(pid, args);
    } else if (_action == 'clam') {
      result = actionClam(pid, args);
    }

    print('result', result);
    if (result == 'ok') {
      updatePublicGS();
      updatePrivateGS();

      for(i = 0; i < num_players; ++i) {
        if(sockets[i] != null) {
          update(i, _action);
        }
      }
      return 'ok';
    } else {
      return {error: result};
    }
  }

  update = function(pid, reason) {
    if (!sockets[pid].connected) sockets[pid] = null;
    if (sockets[pid] == null) return;

    var updateObj = {
          'pid':pid,
          'gid':game_info.gid,
          'game_info':game_info,
          'public':public_gs, 
          'private':private_gs[pid],
          'usernames':usernames,
    }
    sockets[pid].emit(reason + ' success', updateObj);
    print('emmmited', reason + ' success', updateObj);
  }

  self = { // the new game object
    init: function(game_info, host) { init(game_info, host) },
    action: function(pid, _action, args) { return action(pid, _action, args) },

    getGameInfo: function() { return game_info; },
    getUsernames: function() { return usernames; },
    getHost: function() { return host; },

    setHost: function(_host) { host = _host; },
    setSocket: function(pid, socket) { sockets[pid] = socket; },
    update: function(pid, reason) { return update(pid, reason); },

    repr: function() {
      return JSON.stringify({
        game_info: game_info,
        true_cards: true_cards,
        public_gs: public_gs,
        private_gs: private_gs,
        usernames: usernames,
        turn: turn,
        phase: phase,
        host: host,
      }).replace(/\n/g, '\\n').replace(/'/g, '\\\'');
    },
    load: function(json) {
      var jsonObj = JSON.parse(json.replace(/\n/g, '\\n'));
      game_info = jsonObj.game_info;
      true_cards = jsonObj.true_cards;
      public_gs = jsonObj.public_gs;
      private_gs = jsonObj.private_gs;
      usernames = jsonObj.usernames;
      turn = jsonObj.turn;
      phase = jsonObj.phase;
      host = jsonObj.host;

      sockets = [];
      gid = game_info.gid;
      num_players = game_info.num_players;
    },
    sockets: [], // public list
  }
  return self;
}

module.exports = Game;