function startNewPlayer(name, fighting_spirit, allowed_buff_level) {
  return {
    name: name,
    fighting_spirit,
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
    ],
    allowed_buffs: getAllowedBuffs(allowed_buff_level)
  };
}

function getAllowedBuffs(allowed_buff_level) {
  const buffs = [];
  if (allowed_buff_level === 1) {
    buffs.push('slug');
  }
  if (allowed_buff_level === 2) {
    buffs.push('sucker');
  }
  if (allowed_buff_level === 3) {
    buffs.push('guts');
  }
  if (allowed_buff_level === 4) {
    buffs.push('skillful');
  }
  if (allowed_buff_level === 5) {
    buffs.push('rabbit');
  }

  return buffs;
}

async function gameLoop(player_state, opponent_state, game_log) {
  if (isEndgame(player_state, opponent_state)) {
    writeWinnerInHtml(player_state, opponent_state);
    if (fightOutcome(player_state, opponent_state) === 1) {
      addNextFightButton();
    } else {
      addResetButton();
    }
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

function fightOutcome(player_state, opponent_state) {
  if (opponent_state.fighting_spirit <= 0 && player_state.fighting_spirit > 0) return 1;
  else if (player_state.fighting_spirit <= 0 && opponent_state.fighting_spirit > 0) return -1;
  else if (cardsLeft(player_state) <= 0) {
    if (player_state.fighting_spirit > opponent_state.fighting_spirit) return 1;
    else if (player_state.fighting_spirit < opponent_state.fighting_spirit) return -1;
    else return 0;
  }
  else return 0;
}

function cardsLeft(state) {
  return state.cards.map(c => c.quantity).reduce((a, b) => a + b, 0);
}

function getAvailableCards(state) {
  return state.cards.filter(c => c.quantity);
}

function writeWinnerInHtml(player_state, opponent_state) {
  const player_name = player_state.name;
  const opponent_name = opponent_state.name;
  const fight_outcome = fightOutcome(player_state, opponent_state);
  let result = '';
  switch (fight_outcome) {
    case 1:
      result = player_name + ' wins!';
      break;
    case -1:
      result = opponent_name + ' wins!';
      break;
    default:
      result = 'Draw!';
      break;
  }

  document.getElementById('gamelog').innerHTML = `
  <br> RESULT ${result.toUpperCase()}
  <br>====================================================
  ` + document.getElementById('gamelog').innerHTML;
}

function addNextFightButton() {
  GLOBAL_DIFFICULTY++;
  GLOBAL_MODIFIERS++;
  GLOBAL_MAIN_PLAYER = startNewPlayer('Tiku', 10, GLOBAL_MODIFIERS);
  document.getElementById('playeroptions').innerHTML = `<button onclick="startNewGame()">Next Fight</button>`;
}

function addResetButton() {
  GLOBAL_DIFFICULTY = 3;
  GLOBAL_MODIFIERS = 0;
  GLOBAL_MAIN_PLAYER = startNewPlayer('Tiku', 10, GLOBAL_MODIFIERS);
  document.getElementById('playeroptions').innerHTML = `<button onclick="startNewGame()">Restart Tournament</button>`;
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
  return getRandomItemInArray(available_cards).id;
}

function getRandomItemInArray(array) {
  return array[Math.floor(Math.random() * array.length)];
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
  if (Math.random() > 0.5 && state.allowed_buffs.length > 0) {
    const random_card = getRandomItemInArray(state.cards.filter(c => !c.modifier));
    const modifier = getRandomItemInArray(state.allowed_buffs);
    random_card.modifier = modifier;
    random_card.name = capitalize(modifier) + ' ' + random_card.name;
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
  //skillful modifier adds 1 to negative outcomes for the player
  //rabbit modifier reverts the outcome for the player

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
  if (player_card.modifier === 'rabbit') outcome = outcome * -1;

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
  const player_name = last_round.new_player_state.name;
  const opponent_name = last_round.new_opponent_state.name;

  if (last_round.new_player_state.fighting_spirit > 0) {
    document.getElementById('playerfs').innerHTML = player_name + ' <br> Fighting Spirit: ' + '#'.repeat(last_round.new_player_state.fighting_spirit);
  } else {
    document.getElementById('playerfs').innerHTML = player_name + ' <br> Fighting Spirit: ';
  }

  if (last_round.new_opponent_state.fighting_spirit > 0) {
    document.getElementById('opponentfs').innerHTML = opponent_name + ' <br> Fighting Spirit: ' + '#'.repeat(last_round.new_opponent_state.fighting_spirit);
  } else {
    document.getElementById('opponentfs').innerHTML = opponent_name + ' <br> Fighting Spirit: ';
  }

  document.getElementById('gamelog').innerHTML = `
  <br> Turn ${game_log.length}
  <br> ${player_name} used ${last_round.last_player_card.name}
  <br> ${opponent_name} used ${last_round.last_opponent_card.name}
  <br>
  <br>====================================================
  ` + document.getElementById('gamelog').innerHTML;
}

function opponentNameGenerator() {
  //here we try to produce a hawaiian sound name. We can start with a consonant or a vowel and then always follown with the oposite letter type, ending with a vowel
  const vowels = ['a', 'e', 'i', 'o', 'u'];
  const consonants = ['h', 'k', 'l', 'm', 'n', 'p', 'w'];

  let name = '';
  let last_type = '';

  //first a random to get the name size, between 4 and 7 letters
  const name_size = Math.floor(Math.random() * (7 - 4 + 1)) + 4;

  //then we decide the first letter
  if (Math.random() > 0.5) {
    name += getRandomItemInArray(consonants);
    last_type = 'c';
  } else {
    name += getRandomItemInArray(vowels);
    last_type = 'v';
  }

  //alternate between consonants and vowels
  for (let i = 0; i < name_size; i++) {
    if (last_type === 'v') {
      name += getRandomItemInArray(consonants);
      last_type = 'c';
    } else {
      name += getRandomItemInArray(vowels);
      last_type = 'v';
    }
  }

  //end with a vowel
  if (last_type === 'c') {
    name += getRandomItemInArray(vowels);
  }

  return capitalize(name) + ', ' + nicknameGenerator();
}

function capitalize(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function nicknameGenerator() {
  const list_1 = ['death', 'chaos', 'fire', 'sea', 'iron', 'sand', 'coconut', 'wind', 'salt', 'vulcan', 'rock', 'boulder', 'bone', 'skull', 'soul', 'flesh'];
  const list_2 = ['bringer', 'destroyer', 'eater', 'walker', 'king', 'puncher', 'surfer', 'climber', 'hunter', 'crusher', 'ripper'];

  return 'The ' + capitalize(getRandomItemInArray(list_1)) + ' ' + capitalize(getRandomItemInArray(list_2));
}

function startNewGame() {
  const opponent_player = startNewPlayer(opponentNameGenerator(), GLOBAL_DIFFICULTY, GLOBAL_MODIFIERS);

  document.getElementById('playerfs').innerHTML = GLOBAL_MAIN_PLAYER.name + ' <br> Fighting Spirit: ' + '#'.repeat(GLOBAL_MAIN_PLAYER.fighting_spirit);
  document.getElementById('opponentfs').innerHTML = opponent_player.name + ' <br> Fighting Spirit: ' + '#'.repeat(opponent_player.fighting_spirit);
  document.getElementById('playeroptions').innerHTML = '';
  document.getElementById('gamelog').innerHTML = '';

  gameLoop(GLOBAL_MAIN_PLAYER, opponent_player, []);
}

var GLOBAL_PROMISE;
var GLOBAL_DIFFICULTY = 3;
var GLOBAL_MODIFIERS = 0;
var GLOBAL_MAIN_PLAYER = startNewPlayer('Tiku', 10, GLOBAL_MODIFIERS);
startNewGame();