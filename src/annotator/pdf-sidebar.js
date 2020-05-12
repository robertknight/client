import Sidebar from './sidebar';

const DEFAULT_CONFIG = {
  TextSelection: {},
  PDF: {},
};

export default class PdfSidebar extends Sidebar {
  constructor(element, config) {
    super(element, Object.assign({}, DEFAULT_CONFIG, config));
    this.toolbar.scrollContainer = document.querySelector('#viewerContainer');
  }
}
