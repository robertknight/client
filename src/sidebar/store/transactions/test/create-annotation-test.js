import { createAnnotation } from '../create-annotation';
import { createStore } from '../../create-store';

// describe('#createAnnotation', function() {
//   let clock;
//   let now;
//   let store;

//   beforeEach(() => {
//     // Stop the clock to keep the current date from advancing
//     clock = sinon.useFakeTimers();
//     now = new Date();
//     store = createTestStore();
//   });

//   afterEach(() => {
//     clock.restore();
//   });

//   it('should create an annotation', function() {
//     const ann = fixtures.oldAnnotation();
//     store.dispatch(actions.createAnnotation(ann));
//     assert.equal(
//       selectors.findAnnotationByID(store.getState(), ann.id).id,
//       ann.id
//     );
//   });

//   it('should set basic default properties on a new/empty annotation', () => {
//     store.dispatch(actions.createAnnotation({ id: 'myID' }, now));

//     const createdAnnotation = selectors.findAnnotationByID(
//       store.getState(),
//       'myID'
//     );

//     assert.include(createdAnnotation, {
//       created: now.toISOString(),
//       updated: now.toISOString(),
//       text: '',
//     });
//     assert.isArray(createdAnnotation.tags);
//   });

//   it('should set user properties on a new/empty annotation', () => {
//     store.dispatch(actions.createAnnotation({ id: 'myID' }, now));

//     const createdAnnotation = selectors.findAnnotationByID(
//       store.getState(),
//       'myID'
//     );

//     assert.equal(createdAnnotation.user, store.getState().session.userid);
//     assert.equal(
//       createdAnnotation.user_info,
//       store.getState().session.user_info
//     );
//   });

//   it('should set default permissions on a new annotation', () => {
//     fakeDefaultPermissions.returns('somePermissions');
//     store.dispatch(actions.createAnnotation({ id: 'myID' }, now));

//     const createdAnnotation = selectors.findAnnotationByID(
//       store.getState(),
//       'myID'
//     );

//     assert.equal(createdAnnotation.permissions, 'somePermissions');
//   });

//   it('should set group to currently-focused group if not set on annotation', () => {
//     store.dispatch(actions.createAnnotation({ id: 'myID' }, now));

//     const createdAnnotation = selectors.findAnnotationByID(
//       store.getState(),
//       'myID'
//     );

//     assert.equal(
//       createdAnnotation.group,
//       store.getState().groups.focusedGroupId
//     );
//   });

//   it('should set not overwrite properties if present', () => {
//     store.dispatch(
//       actions.createAnnotation(
//         {
//           id: 'myID',
//           created: 'when',
//           updated: 'then',
//           text: 'my annotation',
//           tags: ['foo', 'bar'],
//           group: 'fzzy',
//           permissions: ['whatever'],
//           user: 'acct:foo@bar.com',
//           user_info: {
//             display_name: 'Herbivore Fandango',
//           },
//         },
//         now
//       )
//     );

//     const createdAnnotation = selectors.findAnnotationByID(
//       store.getState(),
//       'myID'
//     );

//     assert.include(createdAnnotation, {
//       created: 'when',
//       updated: 'then',
//       text: 'my annotation',
//       group: 'fzzy',
//       user: 'acct:foo@bar.com',
//     });

//     assert.include(createdAnnotation.tags, 'foo', 'bar');
//     assert.include(createdAnnotation.permissions, 'whatever');
//     assert.equal(
//       createdAnnotation.user_info.display_name,
//       'Herbivore Fandango'
//     );
//   });

//   it('should change tab focus to TAB_ANNOTATIONS when a new annotation is created', function() {
//     store.dispatch(actions.createAnnotation(fixtures.oldAnnotation()));
//     assert.equal(
//       store.getState().selection.selectedTab,
//       uiConstants.TAB_ANNOTATIONS
//     );
//   });

//   it('should change tab focus to TAB_NOTES when a new note annotation is created', function() {
//     store.dispatch(actions.createAnnotation(fixtures.oldPageNote()));
//     assert.equal(store.getState().selection.selectedTab, uiConstants.TAB_NOTES);
//   });

//   it('should expand parent of created annotation', function() {
//     const store = createTestStore();
//     store.dispatch(
//       actions.addAnnotations([
//         {
//           id: 'annotation_id',
//           $highlight: undefined,
//           target: [{ source: 'source', selector: [] }],
//           references: [],
//           text: 'This is my annotation',
//           tags: ['tag_1', 'tag_2'],
//         },
//       ])
//     );
//     // Collapse the parent.
//     store.dispatch(selection.actions.setCollapsed('annotation_id', true));
//     // Creating a new child annotation should expand its parent.
//     store.dispatch(
//       actions.createAnnotation({
//         highlight: undefined,
//         target: [{ source: 'http://example.org' }],
//         references: ['annotation_id'],
//         text: '',
//         tags: [],
//       })
//     );
//     assert.isTrue(store.getState().selection.expanded.annotation_id);
//   });
// });

describe('createAnnotation', () => {});
