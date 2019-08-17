function startNewPlayer() {
  return {
    fighting_spirit: 10,
    cards: [
      {
        id: 1,
        name: 'Jab',
        original_name: 'Jab',
        type: 'jab',
        quantity: 3
      },
      {
        id: 2,
        name: 'Straight',
        original_name: 'Straight',
        type: 'straight',
        quantity: 3
      },
      {
        id: 3,
        name: 'Hook',
        original_name: 'Hook',
        type: 'hook',
        quantity: 3
      },
    ]
  };
}

async function gameLoop(player_state, opponent_state, game_log) {
  if (isEndgame(player_state, opponent_state)) {
    writeWinnerInHtml(player_state, opponent_state);
    addResetButton();
  } else {
    const player_card_id = await getPlayerValidInput(player_state);
    const opponent_card_id = getOpponentValidInput(opponent_state);

    const player_card = player_state.cards.find(c => c.id === player_card_id);
    const opponent_card = opponent_state.cards.find(c => c.id === opponent_card_id);

    const new_player_state = updatePlayerState(player_state, player_card, opponent_card);
    const new_opponent_state = updatePlayerState(opponent_state, opponent_card, player_card);

    updateGameLog(game_log, new_player_state, player_card, new_opponent_state, opponent_card);

    writeTurnOutcomeInHtml(game_log);

    return gameLoop(new_player_state, new_opponent_state, game_log);
  }
}

function isEndgame(player_state, opponent_state) {
  if (player_state.fighting_spirit <= 0) return true;
  if (opponent_state.fighting_spirit <= 0) return true;
  if (cardsLeft(player_state) === 0) return true;
  return false;
}

function cardsLeft(state) {
  return state.cards.map(c => c.quantity).reduce((a, b) => a + b, 0);
}

function getAvailableCards(state) {
  return state.cards.filter(c => c.quantity);
}

function writeWinnerInHtml(player_state, opponent_state) {
  let result = '';
  if (opponent_state.fighting_spirit <= 0 && player_state.fighting_spirit > 0) result = 'Player wins';
  else if (player_state.fighting_spirit <= 0 && opponent_state.fighting_spirit > 0) result = 'opponent wins';
  else if (cardsLeft(player_state) <= 0) {
    if (player_state.fighting_spirit > opponent_state.fighting_spirit) result = 'Player wins';
    else if (player_state.fighting_spirit < opponent_state.fighting_spirit) result = 'opponent wins';
    else if (player_state.fighting_spirit === opponent_state.fighting_spirit) result = 'Draw!';
  }
  else result = 'Draw!';

  document.getElementById('gamelog').innerHTML = `
  <br> RESULT ${result.toUpperCase()}
  <br>====================================================
  ` + document.getElementById('gamelog').innerHTML;
}

function addResetButton() {
  document.getElementById('playeroptions').innerHTML = `<button onclick="startNewGame()">Reset Game</button>`;
}

function getPlayerValidInput(player_state) {
  GLOBAL_PROMISE = defer();
  const valid_cards_html = getAvailableCards(player_state).map((card) => {
    return `<button onclick="selectCard(${card.id})">${card.name} (${card.quantity})</button>`;
  });

  document.getElementById('playeroptions').innerHTML = valid_cards_html.join('<br>');

  return GLOBAL_PROMISE.promise;
}

function selectCard(card) {
  GLOBAL_PROMISE.resolve(card);
}

function defer() {
  const deferred = {
    promise: null,
    resolve: null,
    reject: null
  };

  deferred.promise = new Promise((resolve, reject) => {
    deferred.resolve = resolve;
    deferred.reject = reject;
  });

  return deferred;
}

function getOpponentValidInput(opponent_state) {
  const available_cards = getAvailableCards(opponent_state);
  return getRandomCard(available_cards).id;
}

function getRandomCard(cards) {
  return cards[Math.floor(Math.random() * cards.length)];
}

function updatePlayerState(player_state, last_player_card, last_opponent_card) {
  const card_outcome = getCardsOutcomeForPlayer(last_player_card, last_opponent_card);

  const new_state = JSON.parse(JSON.stringify(player_state));
  new_state.fighting_spirit = new_state.fighting_spirit + card_outcome;
  const new_state_last_player_card = new_state.cards.find(c => c.id === last_player_card.id);

  new_state_last_player_card.quantity--;

  //remove last used modifier
  if (new_state_last_player_card.modifier) {
    new_state_last_player_card.modifier = '';
    new_state_last_player_card.name = new_state_last_player_card.original_name + '';
  }

  checkForModifiers(new_state);

  return new_state;
}

function checkForModifiers(state) {
  const random_card = getRandomCard(state.cards);
  if (Math.random() > 0.5) { //slug modifier
    random_card.modifier = 'slug';
    random_card.name = 'Slug ' + random_card.name;
  } else if (Math.random() > 0.7) { //sucker modifier
    random_card.modifier = 'sucker';
    random_card.name = 'Sucker ' + random_card.name;
  } else if (Math.random() > 0.8) { //guts modifier
    random_card.modifier = 'guts';
    random_card.name = 'Guts ' + random_card.name;
  } else if (Math.random() > 0.6) { //skillful modifier
    random_card.modifier = 'skillful';
    random_card.name = 'Skillful ' + random_card.name;
  }
}

function getCardsOutcomeForPlayer(player_card, opponent_card) {
  //equal moves damage -1 for each
  //jab wins hook, loses to straight
  //straight wins jab, loses to hook
  //hook wins straight, loses to jab

  //slug modifier multiplies by 2 the outcome for both player and opponent
  //sucker modifier add 1 to the outcome of the player
  //guts modifier multiplies by 2 positive outcomes of the player
  //skillful modifier adds 1 to negative outcomes for the opponent

  let outcome;

  if (player_card.type === opponent_card.type) outcome = -1;
  if (player_card.type === 'jab' && opponent_card.type === 'straight') outcome = -2;
  if (player_card.type === 'jab' && opponent_card.type === 'hook') outcome = 1;
  if (player_card.type === 'straight' && opponent_card.type === 'jab') outcome = 1;
  if (player_card.type === 'straight' && opponent_card.type === 'hook') outcome = -2;
  if (player_card.type === 'hook' && opponent_card.type === 'jab') outcome = -2;
  if (player_card.type === 'hook' && opponent_card.type === 'straight') outcome = 1;

  if (player_card.modifier === 'slug' || opponent_card.modifier === 'slug') outcome = outcome * 2;
  if (player_card.modifier === 'sucker') outcome = outcome + 1;
  if (player_card.modifier === 'guts' && outcome > 0) outcome = outcome * 2;
  if (player_card.modifier === 'skillful' && outcome < 0) outcome = outcome + 1;

  return outcome;
}

function updateGameLog(game_log, new_player_state, player_card, new_opponent_state, opponent_card) {
  game_log.push({
    last_player_card: player_card,
    last_opponent_card: opponent_card,
    new_player_state,
    new_opponent_state
  });

  return game_log;
}

function writeTurnOutcomeInHtml(game_log) {
  const last_round = game_log.slice(-1)[0];

  if (last_round.new_player_state.fighting_spirit > 0) {
    document.getElementById('playerfs').innerHTML = 'Player Fighting Spirit: ' + '#'.repeat(last_round.new_player_state.fighting_spirit);
  } else {
    document.getElementById('playerfs').innerHTML = 'Player Fighting Spirit: ';
  }

  if (last_round.new_opponent_state.fighting_spirit > 0) {
    document.getElementById('opponentfs').innerHTML = 'Opponent Fighting Spirit: ' + '#'.repeat(last_round.new_opponent_state.fighting_spirit);
  } else {
    document.getElementById('opponentfs').innerHTML = 'Opponent Fighting Spirit: ';
  }
  console.log(last_round.last_player_card);
  console.log(last_round.last_opponent_card);

  document.getElementById('gamelog').innerHTML = `
  <br> Turn ${game_log.length}
  <br> Player used ${last_round.last_player_card.name}
  <br> Opponent used ${last_round.last_opponent_card.name}
  <br>
  <br>====================================================
  ` + document.getElementById('gamelog').innerHTML;
}

function startNewGame() {
  const player_one = startNewPlayer();
  const player_two = startNewPlayer();

  document.getElementById('playerfs').innerHTML = 'Player Fighting Spirit: ' + '#'.repeat(player_one.fighting_spirit);
  document.getElementById('opponentfs').innerHTML = 'Opponent Fighting Spirit: ' + '#'.repeat(player_two.fighting_spirit);
  document.getElementById('playeroptions').innerHTML = '';
  document.getElementById('gamelog').innerHTML = '';

  gameLoop(player_one, player_two, []);
}

var GLOBAL_PROMISE;
startNewGame();