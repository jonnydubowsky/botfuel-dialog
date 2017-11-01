const logger = require('logtown')('Brain');

/**
 * Brain let the bot to store users and conversations data
 */
class Brain {
  /**
   * @constructor
   * @param {string} botId - the bot id
   */
  constructor(botId) {
    this.botId = botId;
    // TODO: get from config or default value below
    this.dayInMs = 86400000; // One day in milliseconds
  }

  /**
   * Initialize the brain
   * @async
   * @return {Promise.<void>}
   */
  async init() {
    logger.debug('Brain.init');
  }

  /**
   * Add user if not exists
   * @async
   * @param {string} userId - the user id
   */
  async initUserIfNecessary(userId) {
    logger.debug('initUserIfNecessary', userId);
    const userExists = await this.hasUser(userId);
    if (!userExists) {
      await this.addUser(userId);
    }
    await this.initLastConversationIfNecessary(userId);
  }

  /**
   * Add conversation to user if necessary
   * @async
   * @param {string} userId - the user id
   */
  async initLastConversationIfNecessary(userId) {
    logger.debug('initLastConversationIfNecessary', userId);
    const lastConversation = await this.getLastConversation(userId);
    logger.debug('initLastConversationIfNecessary', userId, lastConversation);
    if (!this.isLastConversationValid(lastConversation)) {
      logger.debug('initLastConversationIfNecessary: initialize new');
      await this.addConversation(userId);
    }
  }

  /**
   * Validate user last conversation
   * @param {object} conversation - the conversation to validate
   * @return {boolean}
   */
  isLastConversationValid(conversation) {
    if (!conversation) {
      return false;
    }
    // return true if last conversation time diff with now is less than one day
    return (Date.now() - conversation.createdAt) < this.dayInMs;
  }

  /**
   * Get last conversation value for a given key
   * @async
   * @param {string} userId - user id
   * @param {string} key - last conversation key
   * @returns {Promise}
   */
  async conversationGet(userId, key) {
    logger.debug('conversationGet', userId, key);
    const conversation = await this.getLastConversation(userId);
    return conversation[key];
  }
}

module.exports = Brain;
