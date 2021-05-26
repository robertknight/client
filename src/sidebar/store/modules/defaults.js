import { createStoreModule } from '../create-store';

/**
 * A store module for managing client-side user-convenience defaults.
 *
 * Example: the default privacy level for newly-created annotations
 * (`private` or `shared`). This default is updated when a user selects a
 * different publishing destination (e.g. `Post to [group name]` versus
 * `Post to Only Me`) from the menu rendered by the `AnnotationPublishControl`
 * component.
 *
 * At present, these defaults are persisted between app sessions in `localStorage`,
 * and their retrieval and re-persistence on change is handled in the
 * `persistedDefaults` service.
 */

/** @type {Record<string,string|null>} */
const initialState = {
  /**
   * Note that the persisted presence of any of these defaults cannot be
   * guaranteed, so consumers of said defaults should be prepared to handle
   * missing (i.e. `null`) values. As `null` is a sentinal value indicating
   * "not set/unavailable", a `null` value for a default is otherwise invalid.
   */
  annotationPrivacy: null,
  focusedGroup: null,
};

export default createStoreModule(initialState, {
  namespace: 'defaults',
  actions: {
    /**
     * @param {string} defaultKey
     * @param {string|null} value
     */
    setDefault(state, defaultKey, value) {
      return { [defaultKey]: value };
    },
  },
  selectors: {
    /** @param {string} defaultKey */
    getDefault(state, defaultKey) {
      return state[defaultKey];
    },

    getDefaults(state) {
      return state;
    },
  },
});
