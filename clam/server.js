module.exports = function(server){
  var io = require('socket.io')(server);
  var num_players = 4;
  var num_colors = 2;
  var num_ranks = 12;
  initialize(num_players, num_colors, num_ranks, true);
  var sockets = fillArray(null, num_players);

  io.on('connection', function(socket){
    var pid = null;
    socket.emit('connection', 'user connected');

    socket.on('pid', function(id){
      if(isNaN(id)){
        socket.emit('register error', 'invalid input');
        return;
      }

      if(pid != null){
        socket.emit('register error', 'socket already registered');
        return;
      }
      // register socket with player id
      if(id >= num_players) // checks that id is valid
        socket.emit('register error', 'invalid id');
      else{
        sockets[id] = socket;
        pid = id;
        socket.emit('register success', {
          'game_info':game_info, 
          'public':public_gs, 
          'private':private_gs['cards'][id]
        });
      }
    });

    socket.on('guess', function(guess){
      // guess is {target_id, target_card, rank}
      if(pid == null){
        // checks that socket has registered as player
        socket.emit('guess error', 'pid undefined');
        return;
      }

      if(!(guess instanceof Object) || !('target_id' in guess) || !('target_card' in guess) || !('rank' in guess)
        || isNaN(guess['target_id']) || isNaN(guess['target_card']) || isNaN(guess['rank'])){
        socket.emit('guess error', 'invalid input');
        return;
      }

      if(public_gs['phase'] != 'guess' || public_gs['turn'] != pid){
        // checks that it's player's turn
        socket.emit('guess error', 'out of turn');
        return;
      }
      if(pid == guess['target_id'] || guess['target_id'] >= num_players){
        //checks that player does not target self
        socket.emit('guess error', 'invalid person');
        return;
      }
      if(game_info['has_teams'] && (guess['target_id'] - pid)%num_players == num_players/2){
        // checks that player does not target teammate
        socket.emit('guess error', 'invalid person');
        return;
      }

      var target_id = guess['target_id'];
      var card = guess['target_card'];
      var rank = guess['rank'];
      var cards = public_gs['cards'];
      var private_cards = private_gs['cards'];

      if(card >= cards[0].length || rank > num_ranks) {
        // checks that card pos and rank are valid
        socket.emit('guess error', 'invalid card');
        return;
      }
      if(cards[target_id][card]['visible']){
        // checks that target card has not been revealed
        socket.emit('guess error', 'card already revealed');
        return;
      }
      
      if(true_cards[target_id][card]['rank'] == rank){
        // guess is correct
        // updates public gamestate
        cards[target_id][card]['rank'] = rank;
        cards[target_id][card]['visible'] = true;
        for(i = 0; i < num_players; ++i) {
          // updates private gamestates
          private_cards[i][target_id][card]['rank'] = rank;
          private_cards[i][target_id][card]['visible'] = true;
        }

        // updates guess history
        public_gs['guess_history'].push({
          'id':pid, 
          'target_id':target_id, 
          'card':card, 
          'rank':rank, 
          'correct':true, 
          'flipped_card':card, 
          'flipped_rank':rank});
        public_gs['turn'] = (public_gs['turn']+1)%num_players;
        public_gs['phase'] = 'pass';
      } else {
        // guess is incorrect

        // updates guess history
        public_gs['guess_history'].push({
          'id':pid, 
          'target_id':target_id, 
          'card':card, 
          'rank':rank, 
          'correct':false, 
          'flipped_card':null, 
          'flipped_rank':null});
        public_gs['phase'] = 'flip';
      }
      for(i = 0; i < num_players; ++i){
        if(sockets[i] != null)
          sockets[i].emit('guess success', {
            'game_info':game_info,
            'public':public_gs, 
            'private':private_gs['cards'][i]
          });
      }
    });

    socket.on('pass', function(pass){
      // pass is {card}
      if(pid == null){
        socket.emit('pass error', 'pid undefined');
        return;
      }

      if(!(pass instanceof Object) || !('card' in pass) || isNaN(pass['card'])) {
        socket.emit('pass error', 'invalid input');
        return;
      }

      if(!game_info['has_teams']){
        socket.emit('pass error', 'teammates off');
        return;
      }

      var passer_id = (public_gs['turn']+num_players/2)%num_players;
      if(public_gs['phase'] != 'pass' || passer_id != pid){
        // checks that it's player's turn
        socket.emit('pass error', 'out of turn');
        return;
      }

      var card = pass['card'];

      if(card >= true_cards[0].length) {
        // checks that card is valid
        socket.emit('pass error', 'invalid card');
        return;
      }
      
      var rank = true_cards[pid][card]['rank'];
      // updates private gamestate
      private_gs['cards'][public_gs['turn']][pid][card]['rank'] = rank;
      private_gs['cards'][public_gs['turn']][pid][card]['visible'] = true;

      // updates pass history
      public_gs['pass_history'].push({'id':public_gs['turn'], 'card':card});
      public_gs['phase'] = 'guess';

      for(i = 0; i < num_players; ++i){
        if(sockets[i] != null)
          sockets[i].emit('pass success', {
            'game_info':game_info,
            'public':public_gs, 
            'private':private_gs['cards'][i]
          });
      }
    });

    socket.on('flip', function(flip){
      // flip is {card}
      if (pid == null){
        socket.emit('flip error', 'pid undefined');
        return;
      }

      if(!(flip instanceof Object) || !('card' in flip) || isNaN(flip['card'])) {
        socket.emit('flip error', 'invalid input');
        return;
      }

      if(public_gs['phase'] != 'flip' || public_gs['turn'] != pid){
        // checks that it's player's turn
        socket.emit('flip error', 'out of turn');
        return;
      }

      var card = flip['card'];

      if(card >= true_cards[0].length) {
        // checks that card is valid
        socket.emit('flip error', 'invalid card');
        return;
      }

      var cards = public_gs['cards']
      if(cards[pid][card]['visible']){
        // checks that card is not already flipped
        socket.emit('flip error', 'card already revealed');
        return;
      }

      var rank = true_cards[pid][card]['rank'];

      // updates public gamestate
      cards[pid][card]['rank'] = rank;
      cards[pid][card]['visible'] = true;
      for(i = 0; i < num_players; ++i) {
        // updates private gamestates
        private_cards[i][pid][card]['rank'] = rank;
        private_cards[i][pid][card]['visible'] = true;
      }

      // updates guess history
      public_gs['guess_history'][public_gs['guess_history'].length - 1]['flipped_card'] = card;
      public_gs['guess_history'][public_gs['guess_history'].length - 1]['flipped_rank'] = rank;
      public_gs['turn'] = (public_gs['turn']+1)%num_players;
      public_gs['phase'] = 'pass';

      for(i = 0; i < num_players; ++i){
        if(sockets[i] != null)
          sockets[i].emit('flip success', {
            'game_info':game_info,
            'public':public_gs, 
            'private':private_gs['cards'][i]
          });
      }
    });

    socket.on('chat message', function(data){
      socket.emit('cat response', ['yo', 'wass', 'up']);
    })

    socket.on('disconnect', function(){
      sockets[pid] = null;
    });
  });
  
}

// creates a clone of an array
function cloneObj(obj) {
    function clone(o, curr) {
        for (var l in o){
            if (o[l] instanceof Object) {
                curr[l] = cloneObj(o[l]);
            } else {
                curr[l] = o[l];
            }
        }
        return curr;
    }

    return obj instanceof Array 
             ? obj.slice().map( function (v) { return cloneObj(v); } )
             : obj instanceof Object 
               ? clone(obj, {})
               : obj;
}

// creates array of length 'len' with values 'value'
function fillArray(value, len) {
  var arr = [];
  for (i = 0; i < len; i++) {
    arr.push(value);
  }
  return arr;
}

// shuffles array
function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex ;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

// generates a new list of cards
function generateCards(num_colors, max_rank, num_players) {
  if (max_rank*num_colors % num_players != 0)
    throw 'Card numbers do not match.'

  var deck = [];
  for (i = 1; i <= num_colors; ++i)
    for (j = 1; j <= max_rank; ++j)
      deck.push({'rank':j, 'color':i});

  shuffle(deck);

  var cards = [];
  var hand_size = max_rank*num_colors/num_players;
  for (i = 0; i < num_players; ++i){
    var hand = deck.slice(hand_size*i, hand_size*(i+1));
    hand.sort(function(a, b){return a['rank'] - b['rank']});
    cards.push(hand);
  }

  return cards;
}

// initializes game info, and public and private gamestates
function initialize(num_players, num_colors, num_ranks, has_teams){
  game_info = {
    'num_players':num_players,
    'has_teams':has_teams,
    'statuses':fillArray('off', num_players),
    'chat_log':[]
  };
  
  true_cards = generateCards(num_colors, num_ranks, num_players);

  public_gs = {
    'turn': 0,
    'phase': 'pass',
    'cards': [],
    'pass_history': [],
    'guess_history': []
  };

  private_gs = {
    'cards': []
  }

  for(i = 0; i < true_cards.length; ++i) {
    var hand = [];
    for(j = 0; j < true_cards[0].length; ++j) {
      hand.push({'rank':0, 'color':true_cards[i][j]['color'], 'visible':false});
    }
    public_gs['cards'].push(hand);
  }

  for(i = 0; i < num_players; ++i) {
    var cards = true_cards;
    var player_cards = [];
    for(j = 0; j < cards.length; ++j) {
      var hand = [];
      if(i == j) 
        for (k = 0; k < cards[j].length; ++k)
          hand.push({'rank':cards[j][k]['rank'], 'color':cards[j][k]['color'], 'visible':true});
      else 
        for (k = 0; k < cards[j].length; ++k) 
          hand.push({'rank':0, 'color':cards[j][k]['color'], 'visible':false});
      player_cards.push(hand);
    }
    private_gs['cards'].push(player_cards);
  }
}
