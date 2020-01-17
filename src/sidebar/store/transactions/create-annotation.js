import { createTransaction } from '../create-transaction';
import { defaultPermissions } from '../../util/permissions';
import * as metadata from '../../util/annotation-metadata';
import uiConstants from '../../ui-constants';

export default createTransaction(
  'createAnnotation',
  (store, ann, now = new Date()) => {
    const groupid = store.focusedGroupId();
    const userid = store.profile().userid;

    ann = {
      created: now.toISOString(),
      group: groupid,
      permissions: defaultPermissions(
        userid,
        groupid,
        store.getDefault('annotationPrivacy')
      ),
      tags: [],
      text: '',
      updated: now.toISOString(),
      user: userid,
      user_info: store.getState().session.user_info,

      ...ann,
    };

    // When a new annotation is created, remove any existing annotations
    // that are empty.
    store.deleteNewAndEmptyDrafts([ann]);

    store.addAnnotations([ann]);

    // If the annotation is of type note or annotation, make sure
    // the appropriate tab is selected. If it is of type reply, user
    // stays in the selected tab.
    if (metadata.isPageNote(ann)) {
      store.selectTab(uiConstants.TAB_NOTES);
    } else if (metadata.isAnnotation(ann)) {
      store.selectTab(uiConstants.TAB_ANNOTATIONS);
    }

    (ann.references || []).forEach(parent => {
      // Expand any parents of this annotation.
      store.setCollapsed(parent, false);
    });
  }
);
