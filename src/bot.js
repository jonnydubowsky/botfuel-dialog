const ShellAdapter = require('./adapters/shell_adapter');
const Nlu = require('./nlu');
const DialogManager = require('./dialog_manager');

/**
 * Bot main class.
 */
class Bot {
  constructor(config) {
    console.log('Bot.constructor', config);
    this.adapter = new ShellAdapter(this, config); // TODO: read from config
    this.brain = null; // TODO: fix this
    this.nlu = new Nlu(config);
    this.dm = new DialogManager(this.brain, config);
  }

  run() {
    console.log('Bot.run');
    this.adapter.run();
  }

  async play(userMessages) {
    console.log('Bot.play', userMessages);
    for (const userMessage of userMessages) {
      await this.respond(userMessage);
    }
  }

  /**
   * Responds.
   */
  respond(userMessage) {
    console.log('Bot.respond', userMessage);
    const id = userMessage.id;
    const sentence = userMessage.payload; // TODO: handle the case of non text messages
    this
      .nlu
      .compute(sentence)
      .then(({ entities, intents }) => {
        console.log('Nlu.computation resolved', entities, intents);
        this
          .dm
          .execute(id, intents, entities)
          .then((botMessages) => {
            console.log('Dm.execution resolved', botMessages);
            botMessages.forEach((botMessage) => {
              this.adapter.send(id, botMessage);
            });
          })
          .catch((err) => {
            console.log('Dm.execution rejected', err);
          });
      })
      .catch((err) => {
        console.log('Nlu.computation rejected', err);
      });
  }
}

module.exports = Bot;