const logger = require('logtown')('CorpusExtractor');
const Corpus = require('../corpora/corpus');

/**
 * Extract corpus entities
 */
class CorpusExtractor {
  /**
   * @constructor
   * @param {object} parameters - the extractor parameters
   */
  constructor(parameters) {
    this.dimension = parameters.dimension;
    this.corpus = parameters.corpus;
    this.options = parameters.options;
  }

  /**
   * Extracts the entities by applying extractors defined at the bot level.
   * @param {string} sentence - the sentence
   */
  async compute(sentence) {
    logger.debug('compute', sentence);
    const normalizedSentence = Corpus.normalize(sentence, this.options);
    return this.computeEntities(normalizedSentence, this.corpus.getWords(), []);
  }

  /**
   * Get the remainder for a word in a sentence
   * @param {string} sentence - the sentence
   * @param {string} word - the word to find
   * @return {string|null} the remainder
   */
  getRemainder(sentence, word) {
    logger.debug('getRemainder', sentence, word);
    const startIndex = sentence.indexOf(word);
    if (startIndex < 0) {
      return null;
    }
    if (startIndex > 0 && sentence[startIndex - 1] !== ' ') {
      return null;
    }

    const endIndex = startIndex + word.length;
    if (endIndex < sentence.length && sentence[endIndex] !== ' ') {
      return null;
    }

    return sentence.slice(0, startIndex) + sentence.slice(endIndex);
  }

  /**
   * Get entity
   * @param {*} value - the entity value
   * @return {object} the entity
   */
  getEntity(value) {
    return { value, type: 'string' };
  }

  /**
   * Compute entities in a sentence
   * @param {string} sentence - the sentence
   * @param {string[]} words - the words
   * @param {object[]} entities - the entities
   * @return {object[]} the entities
   */
  computeEntities(sentence, words, entities) {
    logger.debug('computeEntities', sentence, words, entities);
    if (sentence.length > 0) {
      for (const word of words) {
        const normalizedWord = Corpus.normalize(word, this.options);
        const remainder = this.getRemainder(sentence, normalizedWord);
        if (remainder !== null) {
          const value = this.corpus.getValue(normalizedWord, this.options);
          entities.push({ dim: this.dimension, values: [this.getEntity(value)] });
          return this.computeEntities(remainder, words, entities);
        }
      }
    }
    return entities;
  }
}

module.exports = CorpusExtractor;
