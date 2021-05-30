import { createStoreModule } from '../create-store';

function initialState(settings) {
  return {
    /**
     * The ID of the direct-linked group.
     *
     * This ID is initialized from the client's configuration to indicate that
     * the client should focus on a particular group initially. The user may
     * need to login for this step to complete. When the user navigates away
     * from the group or clears the selection, the direct link is "consumed"
     * and no longer used.
     *
     * @type {string|null}
     */
    directLinkedGroupId: settings.group || null,

    /**
     * The ID of the direct-linked annotation.
     *
     * This ID is initialized from the client's configuration to indicate that
     * the client should focus on a particular annotation. The user may need to
     * login to see the annotation. When the user clears the selection or
     * switches to a different group manually, the direct link is "consumed"
     * and no longer used.
     *
     * @type {string|null}
     */
    directLinkedAnnotationId: settings.annotations || null,

    /**
     * Indicates that an error occurred in retrieving/showing the direct linked group.
     * This could be because:
     * - the group does not exist
     * - the user does not have permission
     * - the group is out of scope for the given page
     * @type {boolean}
     */
    directLinkedGroupFetchFailed: false,
  };
}

export default createStoreModule(initialState, {
  namespace: 'directLinked',
  actions: {
    clearDirectLinkedGroupFetchFailed() {
      return { directLinkedGroupFetchFailed: false };
    },

    setDirectLinkedGroupFetchFailed() {
      return { directLinkedGroupFetchFailed: true };
    },

    /** @param {string} id */
    setDirectLinkedGroupId(state, id) {
      return { directLinkedGroupId: id };
    },
    /** @param {string} id */
    setDirectLinkedAnnotationId(state, id) {
      return { directLinkedAnnotationId: id };
    },

    /**
     * Clear the direct linked annotations and group IDs.
     *
     * This action indicates that the direct link has been "consumed" and should
     * not affect future group/annotation etc. fetches.
     */
    clearDirectLinkedIds() {
      return { directLinkedAnnotationId: null, directLinkedGroupId: null };
    },
  },

  reducers: {
    CLEAR_SELECTION() {
      return {
        directLinkedAnnotationId: null,
        directLinkedGroupId: null,
        directLinkedGroupFetchFailed: false,
      };
    },
  },

  selectors: {
    directLinkedAnnotationId(state) {
      return state.directLinkedAnnotationId;
    },
    directLinkedGroupFetchFailed(state) {
      return state.directLinkedGroupFetchFailed;
    },
    directLinkedGroupId(state) {
      return state.directLinkedGroupId;
    },
  },
});
