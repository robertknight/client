import { createStoreModule } from '../create-store';

/**
 * @typedef ToastMessage
 * @prop {('error'|'success'|'notice')} type
 * @prop {string} id
 * @prop {string} message
 * @prop {string} moreInfoURL
 * @prop {boolean} isDismissed
 */

/**
 * @typedef State
 * @prop {ToastMessage[]} messages
 */

/** @type {State} */
const initialState = { messages: [] };

export default createStoreModule(initialState, {
  namespace: 'toastMessages',
  actions: {
    /**
     * @param {ToastMessage} message
     */
    addToastMessage(state, message) {
      return { messages: state.messages.concat({ ...message }) };
    },

    /**
     * @param {string} id
     */
    removeToastMessage(state, id) {
      const updatedMessages = state.messages.filter(
        message => message.id !== id
      );
      return { messages: updatedMessages };
    },

    /**
     * @param {ToastMessage} update
     */
    updateToastMessage(state, update) {
      const updatedMessages = state.messages.map(message => {
        if (message.id && message.id === update.id) {
          return { ...update };
        }
        return message;
      });
      return { messages: updatedMessages };
    },
  },

  selectors: {
    /**
     * Retrieve a message by `id`
     *
     * @param {string} id
     */
    getToastMessage(state, id) {
      return state.messages.find(message => message.id === id);
    },

    /**
     * Retrieve all current messages
     */
    getToastMessages(state) {
      return state.messages;
    },

    /**
     * Return boolean indicating whether a message with the same type and message
     * text exists in the state's collection of messages. This matches messages
     * by content, not by ID (true uniqueness).
     *
     * @param {string} type
     * @param {string} text
     * @return {boolean}
     */
    hasToastMessage(state, type, text) {
      return state.messages.some(message => {
        return message.type === type && message.message === text;
      });
    },
  },
});
