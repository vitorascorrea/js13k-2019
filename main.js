class Fighter {
  constructor(name, fighting_spirit, default_allowed_buffs) {
    this.name = name || Fighter.createRandomName();
    this.fighting_spirit = fighting_spirit;
    this.status = '';
    this.allowed_buffs = default_allowed_buffs;

    this.setDefaultCards();
    this.setHeuristic(fighting_spirit);
  }

  static createRandomName() {
    //here we try to produce a hawaiian sound name. We can start with a consonant or a vowel and then always follown with the oposite letter type, ending with a vowel
    const vowels = ['a', 'e', 'i', 'o', 'u'];
    const consonants = ['h', 'k', 'l', 'm', 'n', 'p', 'w'];

    let name = '';
    let last_type = '';

    //first a random to get the name size, between 4 and 7 letters
    const name_size = Math.floor(Math.random() * (7 - 4 + 1)) + 4;

    //then we decide the first letter
    if (Math.random() > 0.5) {
      name += Utils.getRandomItemInArray(consonants);
      last_type = 'c';
    } else {
      name += Utils.getRandomItemInArray(vowels);
      last_type = 'v';
    }

    //alternate between consonants and vowels
    for (let i = 0; i < name_size; i++) {
      if (last_type === 'v') {
        name += Utils.getRandomItemInArray(consonants);
        last_type = 'c';
      } else {
        name += Utils.getRandomItemInArray(vowels);
        last_type = 'v';
      }
    }

    //end with a vowel
    if (last_type === 'c') {
      name += Utils.getRandomItemInArray(vowels);
    }

    return Utils.capitalize(name) + ', ' + Fighter.nicknameGenerator();
  }

  static nicknameGenerator() {
    const list_1 = ['back', 'scar', 'death', 'chaos', 'fire', 'sea', 'iron', 'sand', 'coconut', 'wind', 'salt', 'vulcan', 'rock', 'boulder', 'bone', 'skull', 'soul', 'flesh'];
    const list_2 = ['bringer', 'destroyer', 'eater', 'walker', 'king', 'puncher', 'surfer', 'climber', 'hunter', 'crusher', 'ripper'];

    return 'The ' + Utils.capitalize(Utils.getRandomItemInArray(list_1)) + ' ' + Utils.capitalize(Utils.getRandomItemInArray(list_2));
  }

  setDefaultCards() {
    this.cards = [
      new Card('jab', 'Jab', 3),
      new Card('straight', 'Straight', 3),
      new Card('hook', 'Hook', 3),
      new Card('block', 'Block', null),
    ]
  }

  setHeuristic(fighting_spirit) {
    this.heuristic = fighting_spirit;
  }

  getCardsLeft() {
    return this.cards.filter(c => c.type !== 'block').map(c => c.quantity).reduce((a, b) => a + b, 0);
  }

  getAvailableCards() {
    return this.cards.filter(c => c.quantity > 0 || c.type === 'block');
  }

  addAllowedBuff(buff) {
    this.allowed_buffs.push(buff);
  }

  applyModifiers() {
    if (Math.random() > 0.5 && this.allowed_buffs.length > 0) {
      const random_card = Utils.getRandomItemInArray(this.cards.filter(c => !c.modifier && c.type !== 'block'));
      const modifier = Utils.getRandomItemInArray(this.allowed_buffs);
      random_card.modifier = modifier;
      random_card.name = Utils.capitalize(modifier) + ' ' + random_card.name;
    }
  }

  updateFighter(last_fighter_card, last_opponent_card) {
    let card_outcome = Card.getCardsOutcomeForPlayer(last_fighter_card, last_opponent_card);

    //being stunned increases the damage taken
    if (this.status === 'stunned') {
      card_outcome--;
    }

    this.fighting_spirit = this.fighting_spirit + card_outcome;

    if (card_outcome <= -2 && Math.random() > 0.3) {
      this.status = 'stunned';
    } else {
      this.status = '';
    }

    if (last_fighter_card.type === 'block') {
      const attack_card = Utils.getRandomItemInArray(this.cards.filter(c => c.type !== 'block'));
      attack_card.quantity--;
    } else {
      last_fighter_card.quantity--;

    }

    //remove last used modifier
    if (last_fighter_card.type === 'block') {
      this.cards.forEach((card) => {
        card.modifier = '';
        card.name = card.original_name + '';
      });
    } else if (last_fighter_card.modifier) {
      last_fighter_card.modifier = '';
      last_fighter_card.name = last_fighter_card.original_name + '';
    }

    this.applyModifiers();
  }
}

class Card {
  constructor(type, name, quantity) {
    this.type = type;
    this.name = name;
    this.original_name = name;
    this.quantity = quantity;
  }

  static getCardsOutcomeForPlayer(player_card, opponent_card) {
    //equal moves damage -1 for each
    //jab wins hook, loses to straight
    //straight wins jab, loses to hook
    //hook wins straight, loses to jab
    //block causes the outcome to be -1 if opponent attack, 0 if both block

    //slug modifier multiplies by 2 the outcome for both player and opponent
    //sucker modifier add 1 to the outcome of the player
    //guts modifier multiplies by 2 positive outcomes of the player
    //skillful modifier adds 1 to negative outcomes for the player
    //rabbit modifier reverts the outcome for the player
    //corkscrew modifier subtracts 3 to negative outcomes for the player if the player is blocking

    let outcome;
    if (player_card.type === 'block' && player_card.type === opponent_card.type) outcome = 0;
    else if (player_card.type === 'block' && opponent_card.type !== 'block') outcome = -1;
    else if (player_card.type !== 'block' && opponent_card.type === 'block') outcome = 0;
    else if (player_card.type === opponent_card.type) outcome = -1;
    else if (player_card.type === 'jab' && opponent_card.type === 'straight') outcome = -2;
    else if (player_card.type === 'jab' && opponent_card.type === 'hook') outcome = 1;
    else if (player_card.type === 'straight' && opponent_card.type === 'jab') outcome = 1;
    else if (player_card.type === 'straight' && opponent_card.type === 'hook') outcome = -2;
    else if (player_card.type === 'hook' && opponent_card.type === 'jab') outcome = -2;
    else if (player_card.type === 'hook' && opponent_card.type === 'straight') outcome = 1;

    if (player_card.modifier === 'slug' || opponent_card.modifier === 'slug') outcome = outcome * 2;
    if (player_card.modifier === 'sucker') outcome = outcome + 1;
    if (player_card.modifier === 'guts' && outcome > 0) outcome = outcome * 2;
    if (player_card.modifier === 'skillful' && outcome < 0) outcome = outcome + 1;
    if (player_card.modifier === 'rabbit') outcome = outcome * -1;
    if (player_card.type === 'block' && opponent_card.modifier === 'corkscrew') outcome = outcome - 3;

    return outcome;
  }
}

class Utils {
  static defer() {
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

  static capitalize(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  static getRandomItemInArray(array) {
    return array[Math.floor(Math.random() * array.length)];
  }
}

class GameState {
  constructor() {
    this.deferred = null;

    window.selectCard = (card) => this.selectCard(card);
    window.restartTournament = () => this.restartTournament();
    window.nextFight = () => this.nextFight();
  }

  generateRandomOpponentFighter(fighting_spirit) {
    this.current_opponent_fighter = new Fighter(null, fighting_spirit, ['slug', 'sucker', 'guts', 'skillful', 'rabbit', 'corkscrew']);
    this.is_current_opponent_random = true;
  }

  generatePlayerFighter() {
    this.player_fighter = new Fighter('Honu', 10, ['slug', 'sucker', 'guts', 'skillful', 'rabbit', 'corkscrew']);
  }

  startNewMatch() {
    this.current_match_log = [];

    this.generatePlayerFighter();
    this.generateRandomOpponentFighter(this.difficulty);

    Render.renderHUD(this);


    this.gameLoop();
  }

  restartTournament() {
    this.difficulty = 3;
    this.current_match = 1;
    this.startNewMatch();
  }

  nextFight() {
    this.difficulty++;
    this.current_match++;
    this.startNewMatch();
  }

  async gameLoop() {
    if (this.isMatchOver()) {
      Render.renderWinnerInHtml(this);
      if (this.fightOutcome() === 1) {
        Render.renderNextFightButton(this);
      } else {
        Render.renderRestartTournamentButton(this);
      }
    } else {
      const player_card_type = await this.getPlayerValidInput();
      const opponent_card_type = this.getOpponentValidInput(this.current_opponent_fighter, this.current_match_log);

      const player_card = this.player_fighter.cards.find(c => c.type === player_card_type);
      const opponent_card = this.current_opponent_fighter.cards.find(c => c.type === opponent_card_type);

      const player_outcome = Card.getCardsOutcomeForPlayer(player_card, opponent_card);
      const opponent_outcome = Card.getCardsOutcomeForPlayer(opponent_card, player_card);

      const last_player_card = Object.assign({}, player_card);
      const last_opponent_card = Object.assign({}, opponent_card);

      this.updateMatchLog(last_player_card, last_opponent_card, player_outcome, opponent_outcome);

      this.player_fighter.updateFighter(player_card, opponent_card);
      this.current_opponent_fighter.updateFighter(opponent_card, player_card);


      Render.renderTurnOutcomeInHtml(this);

      return this.gameLoop();
    }
  }

  async getPlayerValidInput() {
    this.deferred = Utils.defer();
    Render.renderOptions(this);
    return this.deferred.promise;
  }

  selectCard(card) {
    this.deferred.resolve(card);
  }

  getOpponentValidInput(opponent_state, game_log) {
    const available_cards = opponent_state.getAvailableCards();
    if (opponent_state.heuristic <= 4) {
      return Heuristics.simpletonHeuristic(available_cards);
    } else if (opponent_state.heuristic <= 6) {
      return Heuristics.counterLastMoveHeuristic(available_cards, game_log);
    } else if (opponent_state.heuristic > 6) {
      return Heuristics.alwaysUseBuffHeuristic(available_cards, game_log);
    } else {
      return Heuristics.randomHeuristic(available_cards);
    }
  }

  updateMatchLog(player_card, opponent_card, player_outcome, opponent_outcome) {
    this.current_match_log.push({
      last_player_card: player_card,
      new_player_state: this.player,
      player_outcome,
      last_opponent_card: opponent_card,
      new_opponent_state: this.current_opponent,
      opponent_outcome
    });
  }

  isMatchOver() {
    if (this.player_fighter.fighting_spirit <= 0) return true;
    if (this.current_opponent_fighter.fighting_spirit <= 0) return true;
    if (this.player_fighter.getCardsLeft() === 0) return true;
    return false;
  }

  fightOutcome() {
    if (this.current_opponent_fighter.fighting_spirit <= 0 && this.player_fighter.fighting_spirit > 0) return 1;
    else if (this.player_fighter.fighting_spirit <= 0 && this.current_opponent_fighter.fighting_spirit > 0) return -1;
    else if (this.player_fighter.getCardsLeft() <= 0) {
      if (this.player_fighter.fighting_spirit > this.current_opponent_fighter.fighting_spirit) return 1;
      else if (this.player_fighter.fighting_spirit < this.current_opponent_fighter.fighting_spirit) return -1;
      else return 0;
    }
    else return 0;
  }
}

class Render {
  static renderHUD(game_state) {
    Render.renderHealthBar(game_state.player_fighter, 'playerfs');
    Render.renderHealthBar(game_state.current_opponent_fighter, 'opponentfs');
    Render.renderOptions(game_state, 'playeroptions');
    Render.renderMatchLog(game_state, 'gamelog');
  }

  static renderHealthBar(fighter, ui_id) {
    const fighting_spirit = fighter.fighting_spirit > 0 ? fighter.fighting_spirit : 0;
    document.getElementById(ui_id).innerHTML = fighter.name + ' <br> Fighting Spirit: ' + '#'.repeat(fighting_spirit);
  }

  static renderMatchLog(game_state, ui_id) {
    if (game_state.current_match_log && game_state.current_match_log.length > 0) {
      const last_round = game_state.current_match_log.slice(-1)[0];
      const player_name = game_state.player_fighter.name;
      const opponent_name = game_state.current_opponent_fighter.name;

      document.getElementById(ui_id).innerHTML = `
      <br> Turn ${game_state.current_match_log.length}
      <br> ${player_name} used ${last_round.last_player_card.name}! ${last_round.player_outcome} to fighting spirit!
      <br> ${opponent_name} used ${last_round.last_opponent_card.name}! ${last_round.opponent_outcome} to fighting spirit!
      <br>====================================================
      ` + document.getElementById(ui_id).innerHTML;
    } else {
      document.getElementById(ui_id).innerHTML = '';
    }
  }

  static renderOptions(game_state) {
    const valid_cards_html = game_state.player_fighter.getAvailableCards().map((card) => {
      return `<button onclick="selectCard('${card.type}')">${card.name} ${card.quantity ? '(' + card.quantity + ')' : ''}</button>`;
    });

    document.getElementById('playeroptions').innerHTML = valid_cards_html.join('<br>');
  }

  static renderWinnerInHtml(game_state) {
    const player_name = game_state.player_fighter.name;
    const opponent_name = game_state.current_opponent_fighter.name;
    const fight_outcome = game_state.fightOutcome();
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

  static renderTurnOutcomeInHtml(game_state) {
    Render.renderHealthBar(game_state.player_fighter, 'playerfs');
    Render.renderHealthBar(game_state.current_opponent_fighter, 'opponentfs');

    Render.renderMatchLog(game_state, 'gamelog')
  }

  static renderNextFightButton() {
    document.getElementById('playeroptions').innerHTML = `<button onclick="nextFight()">Next Fight</button>`;
  }

  static renderRestartTournamentButton() {
    document.getElementById('playeroptions').innerHTML = `<button onclick="restartTournament()">Restart Tournament</button>`;
  }
}

class Heuristics {
  static simpletonHeuristic(available_cards) {
    return available_cards[0].type;
  }

  static counterLastMoveHeuristic(available_cards, game_log) {
    if (game_log.length > 0) {
      const last_turn = game_log.slice(-1)[0];
      const last_turn_player_move = last_turn.last_player_card.type;
      switch (last_turn_player_move) {
        case 'jab':
          const has_straight = available_cards.find(c => c.type === 'straight');
          if (has_straight) return has_straight.type;
          else return Utils.getRandomItemInArray(available_cards).type;
        case 'straight':
          const has_hook = available_cards.find(c => c.type === 'hook');
          if (has_hook) return has_hook.type;
          else return Utils.getRandomItemInArray(available_cards).type;
        case 'hook':
          const has_jab = available_cards.find(c => c.type === 'jab');
          if (has_jab) return has_jab.type;
          else return Utils.getRandomItemInArray(available_cards).type;
        default:
          return Utils.getRandomItemInArray(available_cards).type;
      }
    } else {
      return Utils.getRandomItemInArray(available_cards).type;
    }
  }

  static alwaysUseBuffHeuristic(available_cards, game_log) {
    const has_card_with_modifier = available_cards.find(c => c.modifier);
    return has_card_with_modifier ? has_card_with_modifier.type : Heuristics.counterLastMoveHeuristic(available_cards, game_log);
  }

  static randomHeuristic(available_cards) {
    return Utils.getRandomItemInArray(available_cards).type;
  }
}

const game_state = new GameState();

game_state.restartTournament();

