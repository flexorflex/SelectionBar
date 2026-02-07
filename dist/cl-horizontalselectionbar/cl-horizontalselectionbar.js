/**
 * Climber Selection Bar - v1.7.0
 * Horizontal selection bar with initial selection capabilities.
 *
 * Originally by Karl Fredberg Sjostrand @ Climber AB
 * Updated for compatibility with Qlik Sense June 2020+ through November 2024+
 *
 * Key fixes in v1.7.0:
 * - CSS fix for blocking div overlay (qv-object-nav / qlik-object-nav)
 * - Replaced unreliable stateUtil.isInAnalysisMode() with robust mode detection
 * - Removed dependency on non-exposed internal RequireJS modules
 * - Uses only stable Extension API and Capability API methods
 * - Improved snapshot and export support
 * - Touch/swipe improvements for mobile compatibility
 */
define([
  'qlik',
  'jquery',
  './lib/js/properties',
  './lib/js/initialSelections',
  'text!./lib/css/style.css'
], function (qlik, $, properties, initialSelections, cssContent) {
  'use strict';

  // Inject CSS once
  var cssInjected = false;
  function injectCSS() {
    if (cssInjected) return;
    cssInjected = true;
    $('<style>').html(cssContent).appendTo('head');
  }

  // =========================================================================
  // Helper: Get field values from a hypercube-like structure
  // We use the Capability API (field.getData) for better compatibility
  // =========================================================================
  function getFieldValues(app, fieldName, callback) {
    try {
      var fieldObj = app.field(fieldName);
      fieldObj.getData({
        rows: 200
      }).OnData.bind(function () {
        var rows = this.rows || [];
        callback(rows);
      });
    } catch (e) {
      console.warn('Climber Selection Bar: Error getting field data for ' + fieldName, e);
      callback([]);
    }
  }

  // =========================================================================
  // Helper: Create field list via createList (more reliable than getData)
  // =========================================================================
  function createFieldList(app, fieldName) {
    return app.createList({
      qDef: {
        qFieldDefs: [fieldName]
      },
      qInitialDataFetch: [{
        qTop: 0,
        qLeft: 0,
        qWidth: 1,
        qHeight: 500
      }]
    });
  }

  // =========================================================================
  // Helper: Determine the selection state class for a field value
  // =========================================================================
  function getStateClass(qState) {
    switch (qState) {
      case 'S': return 'state-selected';
      case 'O': return 'state-optional';
      case 'A': return 'state-alternative';
      case 'X': return 'state-excluded';
      case 'XS': return 'state-excluded';
      case 'XL': return 'state-excluded';
      default: return 'state-optional';
    }
  }

  // =========================================================================
  // Helper: Country name to flag emoji (modern alternative to flag images)
  // =========================================================================
  var countryToCode = {
    'Afghanistan': 'AF', 'Albania': 'AL', 'Algeria': 'DZ', 'Argentina': 'AR',
    'Australia': 'AU', 'Austria': 'AT', 'Belgium': 'BE', 'Brazil': 'BR',
    'Bulgaria': 'BG', 'Canada': 'CA', 'Chile': 'CL', 'China': 'CN',
    'Colombia': 'CO', 'Croatia': 'HR', 'Czech Republic': 'CZ', 'Denmark': 'DK',
    'Ecuador': 'EC', 'Egypt': 'EG', 'Estonia': 'EE', 'EU': 'EU',
    'Finland': 'FI', 'France': 'FR', 'Germany': 'DE', 'Greece': 'GR',
    'Hong Kong': 'HK', 'Hungary': 'HU', 'Iceland': 'IS', 'India': 'IN',
    'Indonesia': 'ID', 'Ireland': 'IE', 'Israel': 'IL', 'Italy': 'IT',
    'Japan': 'JP', 'Korea': 'KR', 'South Korea': 'KR', 'Latvia': 'LV',
    'Lithuania': 'LT', 'Luxembourg': 'LU', 'Malaysia': 'MY', 'Mexico': 'MX',
    'Morocco': 'MA', 'Netherlands': 'NL', 'New Zealand': 'NZ', 'Nigeria': 'NG',
    'Norway': 'NO', 'Pakistan': 'PK', 'Peru': 'PE', 'Philippines': 'PH',
    'Poland': 'PL', 'Portugal': 'PT', 'Romania': 'RO', 'Russia': 'RU',
    'Saudi Arabia': 'SA', 'Singapore': 'SG', 'Slovakia': 'SK', 'Slovenia': 'SI',
    'South Africa': 'ZA', 'Spain': 'ES', 'Sweden': 'SE', 'Switzerland': 'CH',
    'Taiwan': 'TW', 'Thailand': 'TH', 'Turkey': 'TR', 'UAE': 'AE',
    'United Arab Emirates': 'AE', 'UK': 'GB', 'United Kingdom': 'GB',
    'USA': 'US', 'United States': 'US', 'Vietnam': 'VN'
  };

  function countryCodeToEmoji(code) {
    if (!code || code.length !== 2) return '';
    var chars = code.toUpperCase().split('');
    return String.fromCodePoint(chars[0].charCodeAt(0) + 127397) +
           String.fromCodePoint(chars[1].charCodeAt(0) + 127397);
  }

  function getFlagEmoji(countryName) {
    var code = countryToCode[countryName];
    if (code) {
      return countryCodeToEmoji(code);
    }
    // Try the name itself as a 2-letter code
    if (countryName && countryName.length === 2) {
      return countryCodeToEmoji(countryName);
    }
    return '';
  }

  // =========================================================================
  // Helper: Date formatting and parsing
  // =========================================================================
  var dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];

  function formatDate(date, format) {
    if (!format) format = 'YYYY-MM-DD';
    var y = date.getFullYear();
    var m = ('0' + (date.getMonth() + 1)).slice(-2);
    var d = ('0' + date.getDate()).slice(-2);
    return format.replace('YYYY', y).replace('MM', m).replace('DD', d);
  }

  function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
  }

  // =========================================================================
  // Helper: Touch/swipe handling for mobile support
  // =========================================================================
  function enableSwipeScroll($container) {
    var startX, scrollLeft;

    $container.on('touchstart', function (e) {
      startX = e.originalEvent.touches[0].pageX - this.offsetLeft;
      scrollLeft = this.scrollLeft;
    });

    $container.on('touchmove', function (e) {
      if (!startX) return;
      var x = e.originalEvent.touches[0].pageX - this.offsetLeft;
      var walk = (x - startX) * 1.5;
      this.scrollLeft = scrollLeft - walk;
    });

    $container.on('touchend', function () {
      startX = null;
    });
  }

  // =========================================================================
  // Render: Field selection list
  // =========================================================================
  function renderFieldList($wrapper, listItem, app, styles) {
    var props = listItem.props;
    var fieldName = props.fieldName;
    if (!fieldName) {
      $wrapper.html('<span class="cl-selectionbar-item">No field configured</span>');
      return;
    }

    // Create a list object to get field values with selection states
    createFieldList(app, fieldName).then(function (listModel) {
      function renderItems() {
        var layout = listModel.layout;
        if (!layout || !layout.qListObject || !layout.qListObject.qDataPages ||
            !layout.qListObject.qDataPages[0]) {
          return;
        }

        var matrix = layout.qListObject.qDataPages[0].qMatrix;
        var $items = $('<div class="cl-selectionbar-items"></div>');

        matrix.forEach(function (row) {
          var cell = row[0];
          var stateClass = getStateClass(cell.qState);
          var $item = $('<div class="cl-selectionbar-item ' + stateClass + '"></div>');

          $item.text(cell.qText);
          $item.css({
            'font-size': styles.fontSize + 'px',
            'height': styles.itemHeight + 'px',
            'color': cell.qState === 'S' ? styles.selectedColor : styles.textColor
          });

          if (cell.qState === 'S') {
            $item.css('background-color', hexToRGBA(styles.selectedColor, 0.1));
          }

          $item.attr('data-elem', cell.qElemNumber);

          $item.on('click', function () {
            // Use selectValues on the list model for compatibility
            listModel.selectListObjectValues(
              '/qListObject',
              [cell.qElemNumber],
              true // toggle mode
            );
          });

          $items.append($item);
        });

        $wrapper.find('.cl-selectionbar-items').remove();
        $wrapper.append($items);
        enableSwipeScroll($items);
      }

      // Initial render
      renderItems();

      // Update on data changes
      listModel.Validated.bind(renderItems);

      // Store reference for cleanup
      $wrapper.data('listModel', listModel);
    });
  }

  // =========================================================================
  // Render: Variable selection list
  // =========================================================================
  function renderVariableList($wrapper, listItem, app, styles) {
    var props = listItem.props;
    var varName = props.variableName;
    var valuesStr = props.variableValues || '';
    var values = valuesStr.split(',').map(function (v) { return v.trim(); }).filter(function (v) { return v; });

    if (!varName || values.length === 0) {
      $wrapper.html('<span class="cl-selectionbar-item">No variable configured</span>');
      return;
    }

    // Get current variable value
    app.variable.getContent(varName, function (reply) {
      var currentVal = reply.qContent ? reply.qContent.qString : '';

      var $items = $('<div class="cl-selectionbar-items"></div>');

      values.forEach(function (val) {
        var isActive = (val === currentVal);
        var $item = $('<div class="cl-selectionbar-variable-item"></div>');

        if (isActive) {
          $item.addClass('active');
        }

        $item.text(val);
        $item.css({
          'font-size': styles.fontSize + 'px',
          'height': styles.itemHeight + 'px',
          'color': isActive ? styles.selectedColor : styles.textColor
        });

        if (isActive) {
          $item.css('background-color', hexToRGBA(styles.selectedColor, 0.1));
        }

        $item.on('click', function () {
          app.variable.setStringValue(varName, val);
        });

        $items.append($item);
      });

      $wrapper.find('.cl-selectionbar-items').remove();
      $wrapper.append($items);
      enableSwipeScroll($items);
    });
  }

  // =========================================================================
  // Render: Flag selection list
  // =========================================================================
  function renderFlagList($wrapper, listItem, app, styles) {
    var props = listItem.props;
    var fieldName = props.fieldName;
    if (!fieldName) {
      $wrapper.html('<span class="cl-selectionbar-item">No field configured</span>');
      return;
    }

    createFieldList(app, fieldName).then(function (listModel) {
      function renderFlags() {
        var layout = listModel.layout;
        if (!layout || !layout.qListObject || !layout.qListObject.qDataPages ||
            !layout.qListObject.qDataPages[0]) {
          return;
        }

        var matrix = layout.qListObject.qDataPages[0].qMatrix;
        var $items = $('<div class="cl-selectionbar-items"></div>');

        matrix.forEach(function (row) {
          var cell = row[0];
          var stateClass = getStateClass(cell.qState);
          var emoji = getFlagEmoji(cell.qText);
          var $flag = $('<div class="cl-selectionbar-flag ' + stateClass + '" title="' +
                        escapeHtml(cell.qText) + '"></div>');

          if (emoji) {
            $flag.html('<span style="font-size: ' + Math.round(styles.itemHeight * 0.7) +
                       'px">' + emoji + '</span>');
          } else {
            // Fallback to text
            $flag.text(cell.qText.substring(0, 3));
            $flag.css({
              'font-size': styles.fontSize + 'px',
              'color': cell.qState === 'S' ? styles.selectedColor : styles.textColor
            });
          }

          if (cell.qState === 'S') {
            $flag.css('background-color', hexToRGBA(styles.selectedColor, 0.1));
          }

          $flag.attr('data-elem', cell.qElemNumber);

          $flag.on('click', function () {
            listModel.selectListObjectValues(
              '/qListObject',
              [cell.qElemNumber],
              true
            );
          });

          $items.append($flag);
        });

        $wrapper.find('.cl-selectionbar-items').remove();
        $wrapper.append($items);
        enableSwipeScroll($items);
      }

      renderFlags();
      listModel.Validated.bind(renderFlags);
      $wrapper.data('listModel', listModel);
    });
  }

  // =========================================================================
  // Render: Date Range Picker
  // =========================================================================
  function renderDateRangePicker($wrapper, listItem, app, styles) {
    var props = listItem.props;
    var fieldName = props.fieldName;
    if (!fieldName) {
      $wrapper.html('<span class="cl-selectionbar-item">No date field configured</span>');
      return;
    }

    var pickerType = props.dateRangeType || 'range';
    var today = new Date();
    var viewMonth = today.getMonth();
    var viewYear = today.getFullYear();
    var rangeStart = null;
    var rangeEnd = null;

    var $dateRange = $('<div class="cl-selectionbar-daterange"></div>');
    var $trigger = $('<div class="cl-selectionbar-daterange-trigger"></div>');
    $trigger.html('<span class="icon-calendar">&#128197;</span> <span class="date-display">Select date' +
                  (pickerType === 'range' ? 's' : '') + '</span>');
    $trigger.css({
      'font-size': styles.fontSize + 'px',
      'height': styles.itemHeight + 'px',
      'color': styles.textColor
    });

    var $dropdown = $('<div class="cl-selectionbar-daterange-dropdown"></div>');

    function renderCalendar() {
      $dropdown.empty();

      // Header with navigation
      var $header = $('<div class="date-header"></div>');
      var $prevBtn = $('<span class="date-nav">&laquo;</span>');
      var $nextBtn = $('<span class="date-nav">&raquo;</span>');
      var $title = $('<span>' + monthNames[viewMonth] + ' ' + viewYear + '</span>');

      $prevBtn.on('click', function (e) {
        e.stopPropagation();
        viewMonth--;
        if (viewMonth < 0) { viewMonth = 11; viewYear--; }
        renderCalendar();
      });

      $nextBtn.on('click', function (e) {
        e.stopPropagation();
        viewMonth++;
        if (viewMonth > 11) { viewMonth = 0; viewYear++; }
        renderCalendar();
      });

      $header.append($prevBtn, $title, $nextBtn);
      $dropdown.append($header);

      // Day headers
      var $grid = $('<div class="date-grid"></div>');
      dayNames.forEach(function (d) {
        $grid.append('<div class="day-header">' + d + '</div>');
      });

      // Days
      var firstDay = new Date(viewYear, viewMonth, 1).getDay();
      var daysInMonth = getDaysInMonth(viewYear, viewMonth);
      var daysInPrevMonth = getDaysInMonth(viewYear, viewMonth - 1);

      // Previous month trailing days
      for (var p = firstDay - 1; p >= 0; p--) {
        var prevDay = daysInPrevMonth - p;
        $grid.append('<div class="day-cell other-month">' + prevDay + '</div>');
      }

      // Current month days
      for (var d = 1; d <= daysInMonth; d++) {
        var dateObj = new Date(viewYear, viewMonth, d);
        var classes = 'day-cell';
        var isToday = (dateObj.toDateString() === today.toDateString());
        if (isToday) classes += ' today';

        if (rangeStart && dateObj.getTime() === rangeStart.getTime()) classes += ' selected';
        if (rangeEnd && dateObj.getTime() === rangeEnd.getTime()) classes += ' selected';
        if (rangeStart && rangeEnd &&
            dateObj.getTime() > rangeStart.getTime() &&
            dateObj.getTime() < rangeEnd.getTime()) {
          classes += ' in-range';
        }

        var $day = $('<div class="' + classes + '">' + d + '</div>');
        $day.css('color', styles.textColor);
        if (classes.indexOf('selected') !== -1) {
          $day.css({
            'background-color': hexToRGBA(styles.selectedColor, 0.2),
            'color': styles.selectedColor
          });
        }

        (function (dayNum, date) {
          $day.on('click', function (e) {
            e.stopPropagation();
            if (pickerType === 'single') {
              rangeStart = date;
              rangeEnd = date;
              applyDateSelection(app, fieldName, rangeStart, rangeEnd);
              $dropdown.removeClass('open');
              updateTriggerDisplay();
            } else {
              if (!rangeStart || rangeEnd) {
                rangeStart = date;
                rangeEnd = null;
              } else {
                if (date.getTime() < rangeStart.getTime()) {
                  rangeEnd = rangeStart;
                  rangeStart = date;
                } else {
                  rangeEnd = date;
                }
                applyDateSelection(app, fieldName, rangeStart, rangeEnd);
                $dropdown.removeClass('open');
                updateTriggerDisplay();
              }
              renderCalendar();
            }
          });
        })(d, dateObj);

        $grid.append($day);
      }

      // Next month leading days
      var totalCells = firstDay + daysInMonth;
      var remaining = (7 - (totalCells % 7)) % 7;
      for (var n = 1; n <= remaining; n++) {
        $grid.append('<div class="day-cell other-month">' + n + '</div>');
      }

      $dropdown.append($grid);

      // Preset ranges
      if (pickerType === 'range' && props.dateRangePresets && props.dateRangePresets !== 'none') {
        var $presets = $('<div class="presets"></div>');
        var presetList = getPresets(props.dateRangePresets, today);
        presetList.forEach(function (preset) {
          var $btn = $('<span class="preset-btn">' + preset.label + '</span>');
          $btn.css({ 'color': styles.textColor });
          $btn.on('click', function (e) {
            e.stopPropagation();
            rangeStart = preset.start;
            rangeEnd = preset.end;
            applyDateSelection(app, fieldName, rangeStart, rangeEnd);
            $dropdown.removeClass('open');
            updateTriggerDisplay();
          });
          $presets.append($btn);
        });
        $dropdown.append($presets);
      }
    }

    function updateTriggerDisplay() {
      var display = 'Select date' + (pickerType === 'range' ? 's' : '');
      if (rangeStart) {
        display = formatDate(rangeStart);
        if (rangeEnd && rangeEnd.getTime() !== rangeStart.getTime()) {
          display += ' - ' + formatDate(rangeEnd);
        }
      }
      $trigger.find('.date-display').text(display);
    }

    $trigger.on('click', function (e) {
      e.stopPropagation();
      var isOpen = $dropdown.hasClass('open');
      // Close any other open dropdowns
      $('.cl-selectionbar-daterange-dropdown.open').removeClass('open');
      if (!isOpen) {
        renderCalendar();
        $dropdown.addClass('open');
      }
    });

    // Close dropdown when clicking outside
    $(document).on('click.clDateRange', function () {
      $dropdown.removeClass('open');
    });

    $dropdown.on('click', function (e) {
      e.stopPropagation();
    });

    $dateRange.append($trigger, $dropdown);
    $wrapper.append($dateRange);
  }

  function applyDateSelection(app, fieldName, startDate, endDate) {
    if (!startDate) return;
    if (!endDate) endDate = startDate;

    // Build array of all dates in range
    var dates = [];
    var current = new Date(startDate);
    while (current <= endDate) {
      dates.push(formatDate(new Date(current)));
      current.setDate(current.getDate() + 1);
    }

    // Select all dates in the field
    var selectObjs = dates.map(function (d) {
      return { qText: d };
    });

    try {
      app.field(fieldName).selectValues(selectObjs, false, true);
    } catch (e) {
      console.warn('Climber Selection Bar: Failed to apply date selection', e);
    }
  }

  function getPresets(type, today) {
    var presets = [];
    var y = today.getFullYear();
    var m = today.getMonth();
    var d = today.getDate();
    var dow = today.getDay();

    if (type === 'standard') {
      presets = [
        { label: 'Today', start: new Date(y, m, d), end: new Date(y, m, d) },
        { label: 'This Week', start: new Date(y, m, d - dow + 1), end: new Date(y, m, d + (7 - dow)) },
        { label: 'Last Week', start: new Date(y, m, d - dow - 6), end: new Date(y, m, d - dow) },
        { label: 'This Month', start: new Date(y, m, 1), end: new Date(y, m + 1, 0) },
        { label: 'Last Month', start: new Date(y, m - 1, 1), end: new Date(y, m, 0) },
        { label: 'This Year', start: new Date(y, 0, 1), end: new Date(y, 11, 31) },
        { label: 'Last Year', start: new Date(y - 1, 0, 1), end: new Date(y - 1, 11, 31) }
      ];
    } else if (type === 'rolling') {
      presets = [
        { label: 'R3', start: new Date(y, m - 3, d), end: new Date(y, m, d) },
        { label: 'R6', start: new Date(y, m - 6, d), end: new Date(y, m, d) },
        { label: 'R11', start: new Date(y, m - 11, d), end: new Date(y, m, d) },
        { label: 'R12', start: new Date(y, m - 12, d), end: new Date(y, m, d) }
      ];
    }

    return presets;
  }

  // =========================================================================
  // Render: Button / Link
  // =========================================================================
  function renderButton($wrapper, listItem, styles) {
    var props = listItem.props;
    var label = props.buttonLabel || 'Link';
    var url = props.buttonUrl || '#';
    var openNew = props.buttonOpenInNew;

    var $btn = $('<a class="cl-selectionbar-button"></a>');
    $btn.text(label);
    $btn.attr('href', url);
    if (openNew) {
      $btn.attr('target', '_blank');
      $btn.attr('rel', 'noopener noreferrer');
    }
    $btn.css({
      'font-size': styles.fontSize + 'px',
      'height': styles.itemHeight + 'px',
      'color': styles.textColor
    });

    $wrapper.append($btn);
  }

  // =========================================================================
  // Utility
  // =========================================================================
  function hexToRGBA(hex, alpha) {
    if (!hex || hex === 'transparent') return 'rgba(0,0,0,' + alpha + ')';
    hex = hex.replace('#', '');
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    var r = parseInt(hex.substring(0, 2), 16);
    var g = parseInt(hex.substring(2, 4), 16);
    var b = parseInt(hex.substring(4, 6), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  // =========================================================================
  // Main Extension Definition
  // =========================================================================
  return {
    initialProperties: {
      listItems: [],
      props: {
        alignMode: 'left',
        itemGap: 10,
        textColor: '#404040',
        selectedColor: '#009845',
        backgroundColor: 'transparent',
        fontSize: 13,
        itemHeight: 28,
        hideNavIcons: false,
        enableExport: false
      }
    },

    definition: properties,

    // Snapshot support - required for proper export/print behavior
    snapshot: {
      canTakeSnapshot: true
    },

    // Support object for export capabilities
    support: {
      snapshot: true,
      export: true,
      exportData: false
    },

    paint: function ($element, layout) {
      var self = this;
      var app = qlik.currApp(this);
      var objectId = layout.qInfo ? layout.qInfo.qId : 'unknown';

      // Inject CSS on first paint
      injectCSS();

      // Get styling properties (with defaults)
      var props = layout.props || {};
      var styles = {
        textColor: props.textColor || '#404040',
        selectedColor: props.selectedColor || '#009845',
        backgroundColor: props.backgroundColor || 'transparent',
        fontSize: props.fontSize || 13,
        itemHeight: props.itemHeight || 28,
        itemGap: props.itemGap || 10
      };

      var alignMode = props.alignMode || 'left';

      // Clear previous content
      $element.empty();

      // Hide nav icons if configured
      if (props.hideNavIcons) {
        var $objectNav = $element.closest('.qv-object').find('.qv-object-nav, .qlik-object-nav, .qs-object-nav');
        $objectNav.hide();
      }

      // Create main container
      var $container = $('<div class="cl-selectionbar-container align-' + alignMode + '"></div>');
      $container.css('background-color', styles.backgroundColor);

      // Render each list item
      var listItems = layout.listItems || [];
      listItems.forEach(function (listItem, index) {
        if (!listItem || !listItem.props) return;

        var itemProps = listItem.props;
        var listType = itemProps.listType || 'field';
        var labelAlign = itemProps.labelAlign || 'top';
        var showLabel = itemProps.showLabel !== false;

        var $listWrapper = $('<div class="cl-selectionbar-list"></div>');
        if (showLabel && labelAlign === 'left') {
          $listWrapper.addClass('label-left');
        }
        $listWrapper.css('margin-right', styles.itemGap + 'px');

        // Add label
        if (showLabel && itemProps.listLabel) {
          var $label = $('<div class="cl-selectionbar-label"></div>');
          $label.text(itemProps.listLabel);
          $label.css({
            'color': styles.textColor,
            'font-size': Math.max(styles.fontSize - 2, 10) + 'px'
          });
          $listWrapper.append($label);
        }

        // Render based on type
        switch (listType) {
          case 'field':
            renderFieldList($listWrapper, listItem, app, styles);
            break;
          case 'variable':
            renderVariableList($listWrapper, listItem, app, styles);
            break;
          case 'flag':
            renderFlagList($listWrapper, listItem, app, styles);
            break;
          case 'dateRangePicker':
            renderDateRangePicker($listWrapper, listItem, app, styles);
            break;
          case 'button':
            renderButton($listWrapper, listItem, styles);
            break;
        }

        $container.append($listWrapper);
      });

      // Show message if no items configured
      if (listItems.length === 0) {
        $container.html(
          '<div style="padding: 10px; opacity: 0.5; font-size: 12px;">' +
          'Climber Selection Bar - Add list items in the properties panel</div>'
        );
      }

      $element.append($container);

      // Apply initial selections (handles session tracking internally)
      initialSelections.applyAll(app, layout, objectId);

      // Return a resolved promise for Qlik Sense paint contract
      return qlik.Promise.resolve();
    },

    // Cleanup when extension is destroyed
    beforeDestroy: function () {
      // Clean up document-level event handlers
      $(document).off('click.clDateRange');
    }
  };
});
