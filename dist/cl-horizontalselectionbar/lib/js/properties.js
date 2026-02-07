define([], function () {
  'use strict';

  // List item definition (each row in the selection bar)
  var listItemDef = {
    type: 'items',
    label: 'List Item',
    items: {
      listType: {
        type: 'string',
        component: 'dropdown',
        label: 'Type',
        ref: 'props.listType',
        defaultValue: 'field',
        options: [
          { value: 'field', label: 'Field' },
          { value: 'variable', label: 'Variable' },
          { value: 'flag', label: 'Flag' },
          { value: 'dateRangePicker', label: 'Date Range Picker' },
          { value: 'button', label: 'Button / Link' }
        ]
      },
      fieldName: {
        type: 'string',
        ref: 'props.fieldName',
        label: 'Field',
        expression: 'optional',
        show: function (data) {
          return !data.props || !data.props.listType || data.props.listType === 'field' || data.props.listType === 'flag' || data.props.listType === 'dateRangePicker';
        }
      },
      variableName: {
        type: 'string',
        ref: 'props.variableName',
        label: 'Variable Name',
        show: function (data) {
          return data.props && data.props.listType === 'variable';
        }
      },
      variableValues: {
        type: 'string',
        ref: 'props.variableValues',
        label: 'Variable Values (comma separated)',
        show: function (data) {
          return data.props && data.props.listType === 'variable';
        }
      },
      listLabel: {
        type: 'string',
        ref: 'props.listLabel',
        label: 'Label',
        defaultValue: ''
      },
      showLabel: {
        type: 'boolean',
        ref: 'props.showLabel',
        label: 'Show Label',
        defaultValue: true
      },
      labelAlign: {
        type: 'string',
        component: 'dropdown',
        label: 'Label Position',
        ref: 'props.labelAlign',
        defaultValue: 'top',
        options: [
          { value: 'top', label: 'Top' },
          { value: 'left', label: 'Left' }
        ],
        show: function (data) {
          return data.props && data.props.showLabel !== false;
        }
      },
      alwaysOneSelected: {
        type: 'boolean',
        ref: 'props.alwaysOneSelected',
        label: 'Always One Selected',
        defaultValue: false,
        show: function (data) {
          return !data.props || !data.props.listType || data.props.listType === 'field' || data.props.listType === 'flag';
        }
      },
      // Initial selection settings
      initialSelectionHeader: {
        type: 'string',
        component: 'text',
        label: '--- Initial Selection ---',
        show: function (data) {
          return !data.props || !data.props.listType || data.props.listType !== 'button';
        }
      },
      initialSelection: {
        type: 'string',
        ref: 'props.initialSelection',
        label: 'Initial Selection (expression or comma separated)',
        expression: 'optional',
        defaultValue: '',
        show: function (data) {
          return !data.props || !data.props.listType || data.props.listType !== 'button';
        }
      },
      initialSelectionMode: {
        type: 'string',
        component: 'dropdown',
        label: 'Apply Initial Selection',
        ref: 'props.initialSelectionMode',
        defaultValue: 'oncePerSession',
        options: [
          { value: 'oncePerSession', label: 'Once per session' },
          { value: 'everySheet', label: 'Every time on sheet navigation' }
        ],
        show: function (data) {
          return data.props && data.props.initialSelection;
        }
      },
      // Date Range Picker settings
      dateRangeHeader: {
        type: 'string',
        component: 'text',
        label: '--- Date Range Picker Settings ---',
        show: function (data) {
          return data.props && data.props.listType === 'dateRangePicker';
        }
      },
      dateRangeType: {
        type: 'string',
        component: 'dropdown',
        label: 'Picker Type',
        ref: 'props.dateRangeType',
        defaultValue: 'range',
        options: [
          { value: 'range', label: 'Date Range' },
          { value: 'single', label: 'Single Date' }
        ],
        show: function (data) {
          return data.props && data.props.listType === 'dateRangePicker';
        }
      },
      todayExpression: {
        type: 'string',
        ref: 'props.todayExpression',
        label: 'Today Expression (blank = Now())',
        expression: 'optional',
        defaultValue: '',
        show: function (data) {
          return data.props && data.props.listType === 'dateRangePicker';
        }
      },
      dateRangePresets: {
        type: 'string',
        component: 'dropdown',
        label: 'Preset Ranges',
        ref: 'props.dateRangePresets',
        defaultValue: 'none',
        options: [
          { value: 'none', label: 'None' },
          { value: 'standard', label: 'Standard (Today, This Week, This Month...)' },
          { value: 'rolling', label: 'Rolling (R3, R6, R11, R12...)' }
        ],
        show: function (data) {
          return data.props && data.props.listType === 'dateRangePicker' && data.props.dateRangeType === 'range';
        }
      },
      // Button / Link settings
      buttonHeader: {
        type: 'string',
        component: 'text',
        label: '--- Button / Link Settings ---',
        show: function (data) {
          return data.props && data.props.listType === 'button';
        }
      },
      buttonLabel: {
        type: 'string',
        ref: 'props.buttonLabel',
        label: 'Button Text',
        defaultValue: 'Link',
        show: function (data) {
          return data.props && data.props.listType === 'button';
        }
      },
      buttonUrl: {
        type: 'string',
        ref: 'props.buttonUrl',
        label: 'URL / Document Chain Expression',
        expression: 'optional',
        defaultValue: '',
        show: function (data) {
          return data.props && data.props.listType === 'button';
        }
      },
      buttonOpenInNew: {
        type: 'boolean',
        ref: 'props.buttonOpenInNew',
        label: 'Open in new tab',
        defaultValue: false,
        show: function (data) {
          return data.props && data.props.listType === 'button';
        }
      }
    }
  };

  // Main settings section
  var mainSettings = {
    type: 'items',
    component: 'expandable-items',
    label: 'Selection Bar Settings',
    items: {
      alignment: {
        type: 'items',
        label: 'Layout',
        items: {
          alignMode: {
            type: 'string',
            component: 'dropdown',
            label: 'Alignment',
            ref: 'props.alignMode',
            defaultValue: 'left',
            options: [
              { value: 'left', label: 'Left' },
              { value: 'right', label: 'Right' },
              { value: 'center', label: 'Center' },
              { value: 'centerSpread', label: 'Center Spread' },
              { value: 'stack', label: 'Stack' }
            ]
          },
          itemGap: {
            type: 'number',
            ref: 'props.itemGap',
            label: 'Gap between items (px)',
            defaultValue: 10
          }
        }
      },
      styling: {
        type: 'items',
        label: 'Styling',
        items: {
          textColor: {
            type: 'string',
            ref: 'props.textColor',
            label: 'Text Color',
            defaultValue: '#404040',
            expression: 'optional'
          },
          selectedColor: {
            type: 'string',
            ref: 'props.selectedColor',
            label: 'Selected Color',
            defaultValue: '#009845',
            expression: 'optional'
          },
          backgroundColor: {
            type: 'string',
            ref: 'props.backgroundColor',
            label: 'Background Color',
            defaultValue: 'transparent',
            expression: 'optional'
          },
          fontSize: {
            type: 'number',
            ref: 'props.fontSize',
            label: 'Font Size (px)',
            defaultValue: 13
          },
          itemHeight: {
            type: 'number',
            ref: 'props.itemHeight',
            label: 'Item Height (px)',
            defaultValue: 28
          }
        }
      },
      behavior: {
        type: 'items',
        label: 'Behavior',
        items: {
          hideNavIcons: {
            type: 'boolean',
            ref: 'props.hideNavIcons',
            label: 'Hide snapshot/maximize icon',
            defaultValue: false
          },
          enableExport: {
            type: 'boolean',
            ref: 'props.enableExport',
            label: 'Enable export button',
            defaultValue: false
          }
        }
      }
    }
  };

  // Definition returned to the extension framework
  var definition = {
    type: 'items',
    component: 'accordion',
    items: {
      listItems: {
        type: 'array',
        ref: 'listItems',
        label: 'Selection Lists',
        itemTitleRef: 'props.listLabel',
        allowAdd: true,
        allowRemove: true,
        allowMove: true,
        addTranslation: 'Add List Item',
        items: listItemDef.items
      },
      settings: mainSettings,
      appearance: {
        uses: 'settings',
        items: {
          // Remove the general section items we don't need
        }
      }
    }
  };

  return definition;
});
