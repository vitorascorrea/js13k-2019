class Fighter {
  constructor(name, health, level, village, is_player) {
    this.is_player = is_player;
    this.village = village;
    this.name = name || this.createRandomName();
    this.health = health;
    this.status = '';
    this.level = level;
    this.setAllowedBuffs();

    this.setDefaultCards();
  }

  createRandomName() {
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

    return Utils.capitalize(name) + ', ' + Fighter.nicknameGenerator() + ' from ' + this.village.name;
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

  playHeuristic(game_log) {
    return this.village.getVillageHeuristic(this.level, this.getAvailableCards(), game_log);
  }

  getCardsLeft() {
    return this.cards.filter(c => c.type !== 'block').map(c => c.quantity).reduce((a, b) => a + b, 0);
  }

  getAvailableCards() {
    return this.cards.filter(c => c.quantity > 0 || c.type === 'block');
  }

  setAllowedBuffs() {
    if (!this.is_player) {
      this.allowed_buffs = this.village.getVillageBuffs(this.level);
    } else {
      this.allowed_buffs = [];
      if (this.level >= 2) {
        this.allowed_buffs.push('slug');
      }
      if (this.level >= 4) {
        this.allowed_buffs.push('sucker');
      }
      if (this.level >= 8) {
        this.allowed_buffs.push('skillful');
      }
      if (this.level >= 16) {
        this.allowed_buffs.push('rabbit');
      }
      if (this.level >= 32) {
        this.allowed_buffs.push('corkscrew');
      }
    }
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

    this.health = this.health + card_outcome;

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

class Village {
  constructor(name) {
    this.name = name;
    this.setVillageHeuristics();
  }

  getVillageHeuristic(level, available_cards, game_log) {
    if (level <= 2) {
      return this.easy_heuristic(available_cards, game_log);
    } else if (this.level <= 4) {
      return this.medium_heuristic(available_cards, game_log);
    } else {
      return this.hard_heuristic(available_cards, game_log);
    }
  }

  getVillageBuffs(level) {
    const allowed_buffs = []
    if (level >= 2) {
      allowed_buffs.push('slug');
    }
    if (level >= 4) {
      allowed_buffs.push('sucker');
    }
    if (level >= 8) {
      allowed_buffs.push('skillful');
    }
    if (level >= 16) {
      allowed_buffs.push('rabbit');
    }
    if (level >= 32) {
      allowed_buffs.push('corkscrew');
    }

    return allowed_buffs;
  }

  setVillageHeuristics() {
    switch (this.name) {
      case 'Moana': //sea
        this.easy_heuristic = Heuristics.simpletonHeuristic;
        this.medium_heuristic = Heuristics.alwaysUseBuffHeuristic;
        this.hard_heuristic = Heuristics.counterLastMoveHeuristic;
        break;
      case 'Makani': //wind
        this.easy_heuristic = Heuristics.simpletonHeuristic;
        this.medium_heuristic = Heuristics.alwaysUseBuffHeuristic;
        this.hard_heuristic = Heuristics.counterLastMoveHeuristic;
        break;
      case 'Paakai': //salt
        this.easy_heuristic = Heuristics.simpletonHeuristic;
        this.medium_heuristic = Heuristics.alwaysUseBuffHeuristic;
        this.hard_heuristic = Heuristics.counterLastMoveHeuristic;
        break;
      case 'Pohaku': //rock
        this.easy_heuristic = Heuristics.simpletonHeuristic;
        this.medium_heuristic = Heuristics.alwaysUseBuffHeuristic;
        this.hard_heuristic = Heuristics.counterLastMoveHeuristic;
        break;
      case 'Hokipa': //sand
        this.easy_heuristic = Heuristics.simpletonHeuristic;
        this.medium_heuristic = Heuristics.alwaysUseBuffHeuristic;
        this.hard_heuristic = Heuristics.counterLastMoveHeuristic;
        break;
      case 'Kumula': //tree
        this.easy_heuristic = Heuristics.simpletonHeuristic;
        this.medium_heuristic = Heuristics.alwaysUseBuffHeuristic;
        this.hard_heuristic = Heuristics.counterLastMoveHeuristic;
        break;
      case 'Haki': //vulcan
        this.easy_heuristic = Heuristics.simpletonHeuristic;
        this.medium_heuristic = Heuristics.alwaysUseBuffHeuristic;
        this.hard_heuristic = Heuristics.counterLastMoveHeuristic;
        break;
      default:
        break;
    }
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
    else if (player_card.type === 'jab' && opponent_card.type === 'hook') outcome = 0;
    else if (player_card.type === 'straight' && opponent_card.type === 'jab') outcome = 0;
    else if (player_card.type === 'straight' && opponent_card.type === 'hook') outcome = -2;
    else if (player_card.type === 'hook' && opponent_card.type === 'jab') outcome = -2;
    else if (player_card.type === 'hook' && opponent_card.type === 'straight') outcome = 0;

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

  static randomIntFromInterval(min, max) { // min and max included
    return Math.floor(Math.random() * (max - min + 1) + min);
  }
}

class Match {
  constructor(player_fighter, opponent_fighter, game_state) {
    this.deferred = null;
    this.player_fighter = player_fighter;
    this.opponent_fighter = opponent_fighter;
    this.game_state = game_state;
    this.match_log = [];

    window.endMatch = (outcome) => this.endMatch(outcome);

    window.selectCard = (card) => this.selectCard(card);

    MatchRender.renderFightScreen();
    MatchRender.renderHUD(this);
    this.matchLoop();
  }

  async matchLoop() {
    if (this.isMatchOver()) {
      MatchRender.renderWinner(this);
    } else {
      const player_card_type = await this.getPlayerValidInput();
      const opponent_card_type = this.getOpponentValidInput(this.opponent_fighter, this.match_log);

      const player_card = this.player_fighter.cards.find(c => c.type === player_card_type);
      const opponent_card = this.opponent_fighter.cards.find(c => c.type === opponent_card_type);

      //here we get the outcome and a copy of the last played card for the log
      const player_outcome = Card.getCardsOutcomeForPlayer(player_card, opponent_card);
      const opponent_outcome = Card.getCardsOutcomeForPlayer(opponent_card, player_card);
      const last_player_card = Object.assign({}, player_card);
      const last_opponent_card = Object.assign({}, opponent_card);

      this.updateMatchLog(last_player_card, last_opponent_card, player_outcome, opponent_outcome);

      this.player_fighter.updateFighter(player_card, opponent_card);
      this.opponent_fighter.updateFighter(opponent_card, player_card);


      MatchRender.renderTurnOutcomeInHtml(this);

      return this.matchLoop();
    }
  }

  async getPlayerValidInput() {
    this.deferred = Utils.defer();
    MatchRender.renderOptions(this);
    return this.deferred.promise;
  }

  selectCard(card) {
    this.deferred.resolve(card);
  }

  getOpponentValidInput(opponent_state, game_log) {
    const available_cards = opponent_state.getAvailableCards();
    return opponent_state.playHeuristic(game_log);
  }

  updateMatchLog(player_card, opponent_card, player_outcome, opponent_outcome) {
    this.match_log.push({
      last_player_card: player_card,
      new_player_state: this.player,
      player_outcome,
      last_opponent_card: opponent_card,
      new_opponent_state: this.current_opponent,
      opponent_outcome
    });
  }

  isMatchOver() {
    if (this.player_fighter.health <= 0) return true;
    if (this.opponent_fighter.health <= 0) return true;
    if (this.player_fighter.getCardsLeft() === 0) return true;
    return false;
  }

  fightOutcome() {
    if (this.opponent_fighter.health <= 0 && this.player_fighter.health > 0) return 1;
    else if (this.player_fighter.health <= 0 && this.opponent_fighter.health > 0) return -1;
    else if (this.player_fighter.getCardsLeft() <= 0) {
      if (this.player_fighter.health > this.opponent_fighter.health) return 1;
      else if (this.player_fighter.health < this.opponent_fighter.health) return -1;
      else return 0;
    }
    else return 0;
  }

  endMatch(outcome) {
    this.game_state.endMatch(outcome);
  }
}

class GameState {
  constructor() {
    this.days_remaining = 100;
    this.money = 0;
    this.investment_level = 1;
    this.training_level = 1;
    this.contracts_level = 1;
    this.generateIslandVillages();
    this.generateOpenContracts();
    this.generatePlayerFighter();
    this.village = new VillageRender(this);
  }

  generateIslandVillages() {
    this.island_villages = [
      new Village('Moana'), //sea
      new Village('Makani'), //wind
      new Village('Paakai'), //salt
      new Village('Pohaku'), //rock
      new Village('Hokipa'), //sand
      new Village('Kumula'), //tree
      new Village('Haki') //vulcan
    ];
  }

  generatePlayerFighter() {
    this.player_fighter = new Fighter('Honu', 4, this.training_level, new Village('Kauhale'), true);
  }

  generateOpenContracts() {
    this.open_contracts = [];
    let i = 0;
    const bottom_contract_level = this.contracts_level + 2;
    const top_contract_level = this.contracts_level + 4;
    //random contracts
    while (i < this.contracts_level + 3) {
      const random_fs = Utils.randomIntFromInterval(bottom_contract_level, top_contract_level);
      const win_money = random_fs * 10;
      const draw_money = random_fs * 5;
      const lose_money = random_fs * -10;
      const random_village = Utils.getRandomItemInArray(this.island_villages);
      this.open_contracts.push(new Contract(this.contracts_level, random_fs, random_village, win_money, draw_money, lose_money));
      i++;
    }
    //boss contract
    const boss_level = top_contract_level + 1;
    const boss_money = boss_level * 50;
    const random_village = Utils.getRandomItemInArray(this.island_villages);
    this.open_contracts.push(new Contract(this.contracts_level, boss_level, random_village, boss_money, boss_money / 2, -1 * boss_money, true));
  }

  startNewMatch(index) {
    this.current_contract = this.open_contracts[index];
    this.current_contract_index = index;
    new Match(this.player_fighter, this.current_contract.contract_fighter, this);
  }

  endMatch(outcome) {
    this.days_remaining--;
    this.player_fighter.status = '';
    this.player_fighter.setDefaultCards();

    if (outcome === 1) {
      this.money += this.current_contract.win_money;
      if (this.current_contract.is_boss_contract) { //if is boss, we remove contracts from the village
        this.contracts_level++;
        const village_index = this.island_villages.findIndex((v) => v.name === this.current_contract.contract_fighter.village.name);
        this.island_villages.splice(village_index, 1);
        alert('You beat ' + this.current_contract.contract_fighter.name + '! This village is now under the reign of ' + this.player_fighter.village.name);
        this.generateOpenContracts();
      } else {
        this.open_contracts.splice(this.current_contract_index, 1);
      }
    } else if (outcome === -1) {
      this.money += this.current_contract.lose_money;
    } else if (outcome === 0) {
      this.money += this.current_contract.draw_money;
    }

    this.village.renderVillageScreen();
  }

  restAtHospital() {
    this.player_fighter.health += this.investment_level;
    this.days_remaining--;
  }

  trainAtTrainingGrounds() {
    this.training_level += this.investment_level;
    this.player_fighter.setAllowedBuffs();
    this.days_remaining--;
  }

  investMoneyOnVillage() {
    this.money -= this.investment_level * 100;
    this.investment_level++;
    this.days_remaining--;
  }
}

class Contract {
  constructor(contract_level, health, village, win_money, draw_money, lose_money, is_boss_contract) {
    this.contract_fighter = new Fighter(null, health, contract_level, village);
    this.win_money = win_money;
    this.draw_money = draw_money;
    this.lose_money = lose_money;
    this.is_boss_contract = is_boss_contract;
  }
}

class Render {
  static renderHomeScreen() {
    document.getElementById('container').innerHTML = `
    <div style="text-align: center; width: 200px; margin: 0 auto">
      VERY COOL TEXT LOGO
      <br>
      <button onclick="newGame()">New Game</button>
    </div>
    `;
  }

  static renderIntroScreen() {
    document.getElementById('container').innerHTML = `
    <div style="text-align: center; width: 200px; margin: 0 auto">
      VERY COOL INTRO
      <br>
      <button onclick="skipIntro()">Continue</button>
    </div>
    `;
  }
}

class VillageRender {
  constructor(game_state) {
    this.game_state = game_state;
    window.renderHospital = () => this.renderHospital();
    window.renderTrainingGrounds = () => this.renderTrainingGrounds();
    window.renderVillageSquare = () => this.renderVillageSquare();

    window.backToVillage = () => this.renderVillageScreen();

    window.restAtHospital = () => this.restAtHospital();
    window.trainAtTrainingGrounds = () => this.trainAtTrainingGrounds();
    window.checkOpenContracts = () => this.checkOpenContracts();
    window.investMoneyOnVillage = () => this.investMoneyOnVillage();
    window.acceptFight = (index) => this.acceptFight(index);

    this.renderVillageScreen();
  }

  renderVillageScreen() {
    document.getElementById('container').innerHTML = `
    <div id="playerfs"></div>
    <div id="villageinfo"></div>
    <div id="villageoptions"></div>
    `;

    MatchRender.renderHealthBar(this.game_state.player_fighter, 'playerfs');
    this.renderVillageInfo();
    this.renderVillageOptions();
  }

  renderVillageInfo() {
    document.getElementById('villageinfo').innerHTML = `
    Days remaining: ${this.game_state.days_remaining}
    <br>
    Money: $${this.game_state.money}
    <br>
    Training XP: ${this.game_state.training_level}
    <br>
    Village level: ${this.game_state.investment_level}
    `;
  }

  renderVillageOptions() {
    document.getElementById('villageoptions').innerHTML = `
    <button onclick="renderHospital()">Go to hospital</button>
    <br>
    <button onclick="renderTrainingGrounds()">Go to training grounds</button>
    <br>
    <button onclick="renderVillageSquare()">Go to village square</button>
    `;
  }

  renderHospital() {
    document.getElementById('villageoptions').innerHTML = `
    <button onclick="restAtHospital()">Rest at the hospital</button>
    <br>
    <button onclick="backToVillage()">Go back</button>
    `;
  }

  renderTrainingGrounds() {
    document.getElementById('villageoptions').innerHTML = `
    <button onclick="trainAtTrainingGrounds()">Train at training grounds</button>
    <br>
    <button onclick="backToVillage()">Go back</button>
    `;
  }

  renderVillageSquare() {
    document.getElementById('villageoptions').innerHTML = `
    <button onclick="checkOpenContracts()">Check open contracts</button>
    <br>
    <button onclick="investMoneyOnVillage()">Invest money on village</button>
    <br>
    <button onclick="backToVillage()">Go back</button>
    `;
  }

  restAtHospital() {
    const rest_points = this.game_state.investment_level;
    if (window.confirm('Are you sure you wanna rest? You will recover ' + rest_points  + ' points and spend a day.')) {
      this.game_state.restAtHospital();
      this.renderVillageScreen();
    }
  }

  trainAtTrainingGrounds() {
    const train_points = this.game_state.investment_level;
    if (window.confirm('Are you sure you wanna train? You will gain ' + train_points + ' points and spend a day.')) {
      this.game_state.trainAtTrainingGrounds();
      this.renderVillageScreen();
    }
  }

  investMoneyOnVillage() {
    if (this.game_state.money >= this.game_state.investment_level * 100) {
      if (window.confirm('Are you sure you wanna invest on the village? You will spend ' + this.game_state.investment_level * 100 + ' and a day.')) {
        this.game_state.investMoneyOnVillage();
        this.renderVillageScreen();
      }
    } else {
      alert('You dont have enough money to invest for the next level');
    }
  }

  checkOpenContracts() {
    let index = -1;
    document.getElementById('villageoptions').innerHTML = this.game_state.open_contracts.map((open_contract) => {
      index++;
      return `<button onclick="acceptFight(${index})">
      ${open_contract.is_boss_contract ? '(Representative)' : ''} ${open_contract.contract_fighter.name} Win money: ${open_contract.win_money} Lose money: ${open_contract.lose_money} Draw money: ${open_contract.draw_money}
      </button>
      <br>
      `;
    }).join('');

    document.getElementById('villageoptions').innerHTML += `
    <button onclick="backToVillage()">Go back</button>
    `;
  }

  acceptFight(index) {
    if (window.confirm('Are you sure you wanna accept this fight?')) {
      this.game_state.startNewMatch(index);
    }
  }
}

class MatchRender {
  static renderFightScreen() {
    document.getElementById('container').innerHTML = `
    <div id="playerfs"></div>
    <div id="opponentfs"></div>
    <div id="playeroptions"></div>
    <div id="gamelog"></div>
    `;
  }

  static renderHUD(match_state) {
    MatchRender.renderHealthBar(match_state.player_fighter, 'playerfs');
    MatchRender.renderHealthBar(match_state.opponent_fighter, 'opponentfs');
    MatchRender.renderOptions(match_state, 'playeroptions');
    MatchRender.renderMatchLog(match_state, 'gamelog');
  }

  static renderHealthBar(fighter, ui_id) {
    const health = fighter.health > 0 ? fighter.health : 0;
    document.getElementById(ui_id).innerHTML = fighter.name + (fighter.status ? ' (' + fighter.status + ')' : '') + ' <br> Health: ' + '#'.repeat(health);
  }

  static renderMatchLog(match_state, ui_id) {
    if (match_state.match_log && match_state.match_log.length > 0) {
      const last_round = match_state.match_log.slice(-1)[0];
      const player_name = match_state.player_fighter.name;
      const opponent_name = match_state.opponent_fighter.name;

      document.getElementById(ui_id).innerHTML = `
      <br> Turn ${match_state.match_log.length}
      <br> ${player_name} used ${last_round.last_player_card.name}! ${last_round.player_outcome} to fighting spirit!
      <br> ${opponent_name} used ${last_round.last_opponent_card.name}! ${last_round.opponent_outcome} to fighting spirit!
      <br>====================================================
      ` + document.getElementById(ui_id).innerHTML;
    } else {
      document.getElementById(ui_id).innerHTML = '';
    }
  }

  static renderOptions(match_state) {
    const valid_cards_html = match_state.player_fighter.getAvailableCards().map((card) => {
      return `<button onclick="selectCard('${card.type}')">${card.name} ${card.quantity ? '(' + card.quantity + ')' : ''}</button>`;
    });

    document.getElementById('playeroptions').innerHTML = valid_cards_html.join('<br>');
  }

  static renderWinner(match_state) {
    const player_name = match_state.player_fighter.name;
    const opponent_name = match_state.opponent_fighter.name;
    const fight_outcome = match_state.fightOutcome();
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
    document.getElementById('playeroptions').innerHTML = '';
    document.getElementById('gamelog').innerHTML = `
    <br> RESULT ${result.toUpperCase()}
    <br> <button onclick="endMatch(${fight_outcome})">Go back to village</button>
    <br>====================================================
    ` + document.getElementById('gamelog').innerHTML;
  }

  static renderTurnOutcomeInHtml(match_state) {
    MatchRender.renderHealthBar(match_state.player_fighter, 'playerfs');
    MatchRender.renderHealthBar(match_state.opponent_fighter, 'opponentfs');

    MatchRender.renderMatchLog(match_state, 'gamelog')
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

class Director {
  constructor() {
    window.newGame = () => this.newGame();
    window.skipIntro = () => this.skipIntro();
  }

  newGame() {
    Render.renderIntroScreen();
  }

  skipIntro() {
    new GameState();
  }

  displayHomeScreen() {
    Render.renderHomeScreen();
  }
}

new Director().displayHomeScreen();


