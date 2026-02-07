define(['qlik'], function (qlik) {
  'use strict';

  // Session-level tracking to avoid re-applying initial selections
  var _appliedSelections = {};

  /**
   * Parse an initial selection value which may be an expression result
   * or a comma-separated list of values.
   * @param {string} value - Raw initial selection value
   * @returns {string[]} Array of individual values to select
   */
  function parseInitialValues(value) {
    if (!value || typeof value !== 'string') {
      return [];
    }
    // Trim and split by comma, removing empty entries
    return value.split(',').map(function (v) {
      return v.trim();
    }).filter(function (v) {
      return v.length > 0;
    });
  }

  /**
   * Build a unique key for tracking which selections have been applied.
   * @param {string} objectId - Extension object ID
   * @param {number} listIndex - Index of the list item
   * @returns {string}
   */
  function selectionKey(objectId, listIndex) {
    return objectId + '::' + listIndex;
  }

  /**
   * Check if we're in analysis mode (not edit mode).
   * Compatible with multiple Qlik Sense versions.
   * The old stateUtil approach was unreliable (see v1.6.1 changelog).
   * @returns {boolean}
   */
  function isAnalysisMode() {
    try {
      // Modern approach: check the navigation API
      if (typeof qlik.navigation !== 'undefined' && typeof qlik.navigation.getMode === 'function') {
        return qlik.navigation.getMode() === 'analysis';
      }
      // Fallback: check if we can determine mode from the DOM
      var body = document.body;
      if (body) {
        // In edit mode, Qlik adds specific classes to the body
        if (body.classList.contains('qs-edit-mode') ||
            body.classList.contains('qv-mode-edit') ||
            document.querySelector('.qs-mode-edit') !== null) {
          return false;
        }
      }
      // Default to analysis mode if we can't determine
      return true;
    } catch (e) {
      return true;
    }
  }

  /**
   * Apply initial selections for a list item.
   * @param {object} app - Qlik app reference
   * @param {object} listItem - List item configuration from properties
   * @param {string} objectId - Extension object ID
   * @param {number} listIndex - Index of the list item
   * @param {object} layout - Extension layout (for resolved expressions)
   */
  function applyInitialSelection(app, listItem, objectId, listIndex, layout) {
    if (!listItem || !listItem.props) return;

    var props = listItem.props;
    var key = selectionKey(objectId, listIndex);

    // Skip if no initial selection configured
    var initialValue = props.initialSelection;
    if (!initialValue) return;

    // Skip button types
    if (props.listType === 'button') return;

    // Check mode - only apply in analysis mode
    if (!isAnalysisMode()) return;

    // Check if already applied (session-level)
    var mode = props.initialSelectionMode || 'oncePerSession';
    if (mode === 'oncePerSession' && _appliedSelections[key]) {
      return;
    }

    // Mark as applied
    _appliedSelections[key] = true;

    var values = parseInitialValues(initialValue);
    if (values.length === 0) return;

    if (props.listType === 'variable') {
      // For variables, set the first value
      try {
        app.variable.setStringValue(props.variableName, values[0]);
      } catch (e) {
        console.warn('Climber Selection Bar: Failed to set initial variable value', e);
      }
    } else {
      // For fields (field, flag, dateRangePicker), select values
      var fieldName = props.fieldName;
      if (!fieldName) return;

      try {
        var selectObjs = values.map(function (v) {
          // Try numeric first, fall back to text
          var num = Number(v);
          if (!isNaN(num) && v === String(num)) {
            return { qIsNumeric: true, qNumber: num };
          }
          return { qText: v };
        });

        app.field(fieldName).selectValues(selectObjs, false, true);
      } catch (e) {
        console.warn('Climber Selection Bar: Failed to apply initial field selection', e);
      }
    }
  }

  /**
   * Apply all initial selections for the extension.
   * @param {object} app - Qlik app reference
   * @param {object} layout - Extension layout
   * @param {string} objectId - Extension object ID
   */
  function applyAll(app, layout, objectId) {
    if (!layout || !layout.listItems) return;

    layout.listItems.forEach(function (item, index) {
      applyInitialSelection(app, item, objectId, index, layout);
    });
  }

  /**
   * Reset session tracking (useful for testing or forced re-apply).
   */
  function resetSession() {
    _appliedSelections = {};
  }

  return {
    applyAll: applyAll,
    resetSession: resetSession,
    isAnalysisMode: isAnalysisMode
  };
});
