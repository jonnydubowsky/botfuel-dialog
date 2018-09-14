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

const PromptDialog = require('./prompt-dialog');

class CancelDialog extends PromptDialog {
  async dialogWillComplete(userMessage, data) {
    if (data.missingEntities.size === 0) {
      // Clean entities for this dialog so it can be reused later
      await this.brain.conversationSet(userMessage.user, this.parameters.namespace, {});
      const answer = data.matchedEntities.answer.values[0].value;
      return answer === false ? this.complete() : this.cancelPrevious();
    }
    return this.wait();
  }
}

CancelDialog.params = {
  namespace: 'cancel',
  entities: {
    answer: {
      dim: 'system:boolean',
    },
  },
};

module.exports = CancelDialog;