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

const fs = require('fs');
const fsExtra = require('fs-extra');
const dir = require('node-dir');
const Qna = require('botfuel-qna-sdk');
const logger = require('logtown')('BotfuelNlu');
const AuthenticationError = require('../errors/authentication-error');
const ConfigurationError = require('../errors/configuration-error');
const Classifier = require('../classifier');
const BooleanExtractor = require('../extractors/boolean-extractor');
const LocationExtractor = require('../extractors/location-extractor');
const CompositeExtractor = require('../extractors/composite-extractor');
const Nlu = require('./nlu');
const Intent = require('./intent');

/**
 * Sample NLU module using NaturalJS.
 */
class BotfuelNlu extends Nlu {
  /** @inheritdoc */
  constructor(config) {
    logger.debug('constructor', config);
    super(config);
    this.extractor = null;
    this.qna = null;
    this.classifier = null;

    if (config.nlu && config.nlu.intentThreshold === undefined) {
      throw new ConfigurationError('Missing intentThreshold in nlu configuration');
    }
    this.intentFilter = async intents =>
      intents
        .filter(intent => intent.value > config.nlu.intentThreshold)
        .map(intent => intent.name);
    const intentFilterPath = `${this.config.path}/src/intent-filter.js`;
    if (fsExtra.pathExistsSync(intentFilterPath)) {
      this.intentFilter = require(intentFilterPath);
    }
  }

  /**
   * Gets extractor files.
   * @param {String} path - extractors path
   * @returns {Array.<string>} - extractor files
   */
  getExtractorFiles(path) {
    let files = [];
    if (fs.existsSync(path)) {
      files = dir.files(path, { sync: true }) || files;
    }
    return files.filter(file => file.match(/^.*.js$/));
  }

  /**
   * Gets extractors.
   * @param {String} path - extractors path
   * @returns {Array.<*>} - extractor instances
   */
  getExtractors(path) {
    // user extractors
    const extractors = this.getExtractorFiles(path).map((file) => {
      const ExtractorConstructor = require(file);
      return new ExtractorConstructor(ExtractorConstructor.params);
    });
    // system extractors
    extractors.push(new BooleanExtractor({ locale: this.config.locale }));
    extractors.push(new LocationExtractor({}));
    return extractors;
  }

  /** @inheritdoc */
  async init() {
    logger.debug('init');
    super.init();

    // Extractors
    this.extractor = new CompositeExtractor({
      extractors: this.getExtractors(`${this.config.path}/src/extractors`),
    });
    // Classifier
    this.classifier = new Classifier(this.config);
    await this.classifier.init();
    // QnA
    if (this.config.nlu.qna) {
      if (!process.env.BOTFUEL_APP_ID || !process.env.BOTFUEL_APP_KEY) {
        logger.error('BOTFUEL_APP_ID and BOTFUEL_APP_KEY are required for using the QnA service!');
      }
      this.qna = new Qna({
        appId: process.env.BOTFUEL_APP_ID,
        appKey: process.env.BOTFUEL_APP_KEY,
      });
    }
  }

  /** @inheritdoc */
  async compute(sentence, context) {
    logger.debug('compute', sentence);
    if (this.config.nlu.qna) {
      logger.debug('compute: qna', this.config.nlu.qna);
      if (this.config.nlu.qna.when === 'before') {
        const intents = await this.computeWithQna(sentence);
        if (intents.length > 0) {
          return { intents };
        }
        return this.computeWithClassifier(sentence, context);
      }
      const classifierResult = await this.computeWithClassifier(sentence, context);
      if (classifierResult.intents.length > 0) {
        return classifierResult;
      }
      const intents = await this.computeWithQna(sentence);
      if (intents.length > 0) {
        return { intents };
      }
      return {
        intents: [],
        entities: classifierResult.entities,
      };
    }
    return this.computeWithClassifier(sentence, context);
  }

  /**
   * Computes intents and entities using QnA.
   * @param {String} sentence - the user sentence
   * @returns {Promise.<Object>}
   */
  async computeWithQna(sentence) {
    logger.debug('computeWithQna', sentence);
    try {
      const qnas = await this.qna.getMatchingQnas({ sentence });
      logger.debug('computeWithQna: qnas', qnas);

      const strict = this.config.nlu.qna.strict;
      if ((strict && qnas.length === 1) || (!strict && qnas.length > 0)) {
        const intents = [
          new Intent({
            name: 'qnas',
            type: Intent.TYPE_QNA,
            answers: [[{ value: qnas[0].answer }]],
          }),
        ];

        return intents;
      }

      return [];
    } catch (error) {
      logger.error('Could not classify with QnA!');
      if (error.statusCode === 403) {
        throw new AuthenticationError();
      }
      throw error;
    }
  }

  /**
   * Computes intents and entities using the classifier.
   * @param {String} sentence - the user sentence
   * @param {Object} [context] - an optional context (brain and userMessage)
   * @returns {Promise.<Object>}
   */
  async computeWithClassifier(sentence, context) {
    logger.debug('computeWithClassifier', sentence);
    const entities = await this.extractor.compute(sentence);
    logger.debug('computeWithClassifier: entities', entities);
    let intents = await this.classifier.compute(sentence, entities);
    logger.debug('computeWithClassifier: non filtered intents', intents);
    intents = await this.intentFilter(intents, context);
    intents = intents.slice(0, this.config.multiIntent ? 2 : 1);
    logger.debug('computeWithClassifier: filtered intents', intents);

    intents = intents.map(i => new Intent({ name: i, type: Intent.TYPE_INTENT }));
    logger.debug('computeWithClassifier: final intents', { intents });
    return {
      intents,
      entities,
    };
  }
}

module.exports = BotfuelNlu;
