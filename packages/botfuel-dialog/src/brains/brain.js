/**
 * Copyright (c) 2017 - present, Botfuel (https://www.botfuel.io).
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// @flow

import type { Config } from '../config';
import type { DialogsData, UserData, ConversationData } from '../types';

const uuidv4 = require('uuid/v4');
const logger = require('logtown')('Brain');
const MissingImplementationError = require('../errors/missing-implementation-error');

/**
 * A brain is a storage for user and conversation data.
 * Some of the brain methods use a scope which is either 'user' or 'last conversation'.
 */
class Brain {
  config: Config;
  conversationDuration: number;

  constructor(config: Config) {
    this.conversationDuration = config.brain.conversationDuration;
  }

  /**
   * Initialize the brain.
   * @private
   */
  async init(): Promise<void> {
    logger.debug('init');
  }

  /**
   * Empty the brain.
   * @abstract
   */
  async clean(): Promise<void> {
    throw new MissingImplementationError();
  }

  /**
   * Get the init value for creating a new user.
   */
  getUserInitValue(userId: string): UserData {
    return {
      _userId: userId,
      _conversations: [this.getConversationInitValue()],
      _createdAt: Date.now(),
    };
  }

  /**
   * Add a user if necessary (if he does not exist).
   */
  async addUserIfNecessary(userId: string): Promise<void> {
    logger.debug('addUserIfNecessary', userId);
    const userExists = await this.hasUser(userId);
    if (!userExists) {
      await this.addUser(userId);
    }
  }

  /**
   * Check if there is a user for a given id.
   * @abstract
   */
  async hasUser(userId: string): Promise<boolean> { // eslint-disable-line no-unused-vars
    throw new MissingImplementationError();
  }

  /**
   * Add a user.
   */
  async addUser(userId: string): Promise<UserData> { // eslint-disable-line no-unused-vars
    throw new MissingImplementationError();
  }

  /**
   * Get a user.
   */
  async getUser(userId: string): Promise<UserData> { // eslint-disable-line no-unused-vars
    throw new MissingImplementationError();
  }

  /**
   * Get all users.
   * @returns the users
   */
  async getAllUsers(): Promise<UserData[]> {
    throw new MissingImplementationError();
  }

  /**
   * Get the init value for creating a new conversation.
   */
  getConversationInitValue(): ConversationData {
    return {
      _dialogs: {
        stack: [],
        previous: [],
      },
      _createdAt: Date.now(),
      uuid: uuidv4(),
    };
  }

  /**
   * Add a conversation to a user.
   * @returns the last conversation added
   */
  async addConversation(
    userId: string, // eslint-disable-line no-unused-vars
  ): Promise<ConversationData> {
    throw new MissingImplementationError();
  }

  /**
   * Get the last conversation of the user.
   * @returns the last conversation of the user
   */
  async getLastConversation(
    userId: string, // eslint-disable-line no-unused-vars
  ): Promise<ConversationData> {
    throw new MissingImplementationError();
  }

  /**
   * Set a value for a key within the scope of the user.
   * @abstract
   * @returns the updated user
   */
  async userSet(
    userId: string,
    key: string,
    value: mixed, // eslint-disable-line no-unused-vars
  ): Promise<UserData> {
    throw new MissingImplementationError();
  }

  /**
   * Get a value for a key within the scope of the user.
   */
  async userGet(userId: string, key: string): Promise<mixed> {
    logger.debug('userGet', userId, key);
    const user = await this.getUser(userId);
    return user[key];
  }

  /**
   * Set a value for a key within the scope of the last conversation of a user.
   * @returns the updated conversation
   */
  async conversationSet(
    userId: string,
    key: string,
    value: mixed, // eslint-disable-line no-unused-vars
  ): Promise<ConversationData> {
    throw new MissingImplementationError();
  }

  /**
   * Get the value for a given key within the scope of the last conversation of a user.
   * @returns the value
   */
  async conversationGet(userId: string, key: string): Promise<mixed> {
    logger.debug('conversationGet', userId, key);
    const conversation = await this.getLastConversation(userId);
    return conversation[key];
  }

  /**
   * Validate the last conversation of an user
   */
  isConversationValid(conversation: ConversationData): boolean {
    return (
      conversation !== undefined && Date.now() - conversation._createdAt < this.conversationDuration
    );
  }

  /**
   * Get dialogs data from the last conversation
   */
  async getDialogs(userId: string): Promise<DialogsData> {
    const dialogs = await this.conversationGet(userId, '_dialogs');
    return ((dialogs: any): DialogsData); // Flow is not clever enough
  }

  /**
   * Set dialogs data in the last conversation
   */
  async setDialogs(userId: string, dialogs: DialogsData): Promise<void> {
    if (dialogs.isNewConversation) {
      await this.addConversation(userId);
      delete dialogs.isNewConversation;
    }
    await this.conversationSet(userId, '_dialogs', dialogs);
  }

  /**
   * Get a value for a key within the global scope.
   * @abstract
   */
  async botGet(key: string): Promise<mixed> { // eslint-disable-line no-unused-vars
    throw new MissingImplementationError();
  }

  /**
   * Set a value for a key within the global scope.
   * @abstract
   */
  async botSet<T>(key: string, value: T): Promise<T> { // eslint-disable-line no-unused-vars
    throw new MissingImplementationError();
  }
}

module.exports = Brain;
