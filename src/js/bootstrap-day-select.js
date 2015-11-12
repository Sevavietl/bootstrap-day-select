;(function($, window, document, undefined) {

	/*global jQuery, moment*/

	'use strict';

	var pluginName = 'daySelect';

	var DaySelect = function(element, options) {
		this._element = element;
		this.$element = $(element);
		this._init(options);
	};

	DaySelect.defaults = {
		highlightSelectedDate: true,
		highlightToday: true,
		hint: 'dddd, Do MMMM YYYY',
		injectStyle: true,
		offDays: 'Sat,Sun',
		offDaysFormat: 'ddd',
		onSelectedDateChanged: null,
		selectedDate: moment().clone().startOf('day'),
		selectedDateFormat: 'YYYY-MM-DD',
		selectedItemWidth: 140,
		showCalendar: true,
		showOffDays: true,
		showStartOfWeek: true,
		size: undefined,
		startOfWeek: 'Mon',
		startOfWeekFormat: 'ddd',
		squareEdges: false,
		text: 'ddd<br/>Do',
		textSelected: 'dddd<br/>Do, MMMM YYYY',
		useBootstrap2: false,
		startDate: moment(new Date(-8640000000000000)),
		startDateFormat: 'YYYY-MM-DD',
		endDate: moment(new Date(8640000000000000)),
		endDateFormat: 'YYYY-MM-DD',
		// My changes: sevavietl
		startWithSelected: true,
		numberOfDaysToShow: 6,
	};

	DaySelect.prototype = {

		setSelectedDate: function(date, format) {
			this._setSelectedDate(moment(date, format ? format : this.options.selectedDateFormat));
			this._render();
		},

		remove: function() {

			// Cleanup dom and remove events
			this._destroy();

			// Only remove data if user initiated
			$.removeData(this, 'plugin_' + pluginName);
		},

		_init: function(options) {

			this.options = $.extend({}, DaySelect.defaults, options);

			// Parse and set start and end dates
			if (typeof this.options.startDate === 'string') {
				this.options.startDate = moment(this.options.startDate, this.options.startDateFormat).clone().startOf('day');
			}
			if (typeof this.options.endDate === 'string') {
				this.options.endDate = moment(this.options.endDate, this.options.endDateFormat).clone().startOf('day');
			}

			// Parse, set and validate the initially selected date
			// 1. overridding the default value of today
			if (typeof this.options.selectedDate === 'string') {
				this.options.selectedDate = moment(this.options.selectedDate, this.options.selectedDateFormat).clone().startOf('day');
			}
			// 2. enforce selectedDate with in startDate and endDate range
			if (this.options.selectedDate.isBefore(this.options.startDate)) {
				this.options.selectedDate = this.options.startDate.clone();
			}
			if (this.options.selectedDate.isAfter(this.options.endDate)) {
				this.options.selectedDate = this.options.endDate.clone();
			}

			// Parse and nomalize size options
			if (this.options.size === 'small') {
				this.options.size = 'sm';
			}
			else if (this.options.size === 'large') {
				this.options.size = 'lg';
			}

			this._destroy();
			this._subscribeEvents();
			this._render();
		},

		_unsubscribeEvents: function() {

			// $(window).off(); // TODO Turns off all resize events not just the one being destroyed
			this.$element.off('click');
			this.$element.off('selectedDateChanged');
		},

		_subscribeEvents: function() {

			this._unsubscribeEvents();

			this.$element.on('click', $.proxy(this._clickedHandler, this));

			if (typeof (this.options.onSelectedDateChanged) === 'function') {
				this.$element.on('selectedDateChanged', this.options.onSelectedDateChanged);
			}

			if (this.options.fillWidth) {
				$(window).on('resize', $.proxy(this._resize, this));
			}
		},

		_subscribeDropdown: function () {
			var that = this;

			$(".ds-wrapper").unbind("click.bs.dropdown");

			$(".ds-wrapper").on("click.bs.dropdown", function(e){
				var target = $(e.target);
				if (
					target.hasClass('glyphicon-calendar')
					|| target.hasClass('ds-nav-up')
					|| target.hasClass('ds-nav-down')
				) {
					e.preventDefault();
					e.stopPropagation();

					if (target.hasClass('ds-nav-up')) {
						that._back();
					}
					else if (target.hasClass('ds-nav-down')) {
						that._forward();
					}
				}
			});
		},

		_destroy: function() {

			if (this.initialized) {

				// Cleanup dom
				if (this.$calendar) {
					this.$calendar.datepicker('remove');
				}
				this.$wrapper.remove();
				this.$wrapper = null;
				// this.$element.remove();

				// Switch off events
				this._unsubscribeEvents();
			}

			// Reset flag
			this.initialized = false;
		},

		_clickedHandler: function(event) {
			event.preventDefault();
			var target = $(event.target);
			var classList = target.attr('class');
			if (classList.indexOf('ds-nav-up') != -1) {
				this._back();
			}
			else if (classList.indexOf('ds-nav-down') != -1) {
				this._forward();
			}
			else if (classList.indexOf('ds-item') != -1) {
				this._select(target.attr('data-moment'));
			}
		},

		_setSelectedDate: function(selectedDate) {

			var that = this;

			if ((!selectedDate.isSame(this.options.selectedDate)) &&
				(!selectedDate.isBefore(this.options.startDate)) &&
				(!selectedDate.isAfter(this.options.endDate))) {

				this.options.selectedDate = selectedDate.startOf('day');
				this.$element.trigger('selectedDateChanged', [selectedDate.clone()]);
			}


		},

		_back: function() {
			this._setSelectedDate(this.options.selectedDate.clone().subtract('day', 1));
			this._render();
		},

		_forward: function() {
			this._setSelectedDate(this.options.selectedDate.clone().add('day', 1));
			this._render();
	    },

	    _select: function(date) {
			this._setSelectedDate(moment(date, this.options.selectedDateFormat));
			this._render();
	    },

	    _calendarSelect: function(event) {
			this._setSelectedDate(moment(event.date));
			this._render();
		},

		_resize: function() {
			this.options.width = this.$element.width();
			this._render();
		},

		_render: function() {

			var self = this;

			if (!this.initialized) {

				// Setup first time only components, reused on later _renders
				this.$element
					.addClass(this.options.useBootstrap2 ? 'pagination' : '')
					.removeClass('datepaginator datepaginator-sm datepaginator-lg')
					.addClass(this.options.size === 'sm' ? 'datepaginator-sm' : this.options.size === 'lg' ? 'datepaginator-lg' : 'datepaginator');
				this.$wrapper = $(this._template.wrapper);
				this.$list = $(this._template.list);
				this.$upNav = $(this._template.navItem)
					.addClass('ds-nav-up')
					.addClass(this.options.size === 'sm' ? 'ds-nav-sm' : this.options.size === 'lg' ? 'ds-nav-lg' : '')
					.addClass(this.options.squareEdges ? 'ds-nav-square-edges' : '')
					.append($(this._template.icon)
						.addClass('glyphicon-chevron-up')
						.addClass('ds-nav-up'))
					.width(this.options.navItemWidth);
				this.$downNav = $(this._template.navItem)
					.addClass('ds-nav-down')
					.addClass(this.options.size === 'sm' ? 'ds-nav-sm' : this.options.size === 'lg' ? 'ds-nav-lg' : '')
					.addClass(this.options.squareEdges ? 'ds-nav-square-edges' : '')
					.append($(this._template.icon)
						.addClass('glyphicon-chevron-down')
						.addClass('ds-nav-down'))
					.width(this.options.navItemWidth);
				this.$calendar = this.options.showCalendar ? $(this._template.calendar) : undefined;
				this.initialized = true;
			}
			else {

				// Remove datepicker from DOM
				if (this.$calendar) {
					this.$calendar.datepicker('remove');
				}
			}

			// Get data then string together DOM elements
			var data = this._buildData();

			this.$wrapper.empty()
				.append($(this._template.field).prepend(this.options.selectedDate.format(this.options.selectedDateFormat)))
				.append(this.$list.empty());
			this.$element.empty().append(this.$wrapper);

			// Left nav
			this.$upNav
				.removeClass('ds-no-select')
				.attr('title', '');
			if (data.isSelectedStartDate) {
				this.$upNav
					.addClass('ds-no-select')
					.attr('title', 'Start of valid date range');
			}
			this.$list.append($(self._template.listItem).append(this.$upNav));
			this.$list.append($(self._template.listDivider));

			// Items
			$.each(data.items, function(id, item) {

				var $a = $(self._template.dateItem)
					.attr('data-moment', item.m)
					.attr('title', item.hint)
					.width(item.itemWidth);

				if (item.isSelected && self.options.highlightSelectedDate) {
					$a.addClass('ds-selected');
				}
				if (item.isToday && self.options.highlightToday) {
					$a.addClass('ds-today');
				}
				if (item.isStartOfWeek && self.options.showStartOfWeek) {
					$a.addClass('ds-divider');
				}
				if (item.isOffDay && self.options.showOffDays) {
					$a.addClass('ds-off');
				}
				if (item.isSelected && self.options.showCalendar) {
					$a.append(self.$calendar);
				}
				if (self.options.size === 'sm') {
					$a.addClass('ds-item-sm');
				}
				else if (self.options.size === 'lg') {
					$a.addClass('ds-item-lg');
				}
				if (!item.isValid) {
					$a.addClass('ds-no-select');
				}
				$a.append(item.text);

				self.$list.append($(self._template.listItem).append($a));
				self.$list.append($(self._template.listDivider));
			});

			// Right nav
			this.$downNav
				.removeClass('ds-no-select')
				.attr('title', '');
			if (data.isSelectedEndDate) {
				this.$downNav
					.addClass('ds-no-select')
					.attr('title', 'End of valid date range');
			}
			this.$list.append($(self._template.listItem).append(this.$downNav));

			// Add datepicker and setup event handling
			if (this.$calendar) {
				this.$calendar
					.datepicker({
						autoclose: true,
						forceParse: true,
						startView: 0, //2
						minView: 0, //2
						// todayBtn: true,
						todayHighlight: true,
						startDate: this.options.startDate.toDate(),
						endDate: this.options.endDate.toDate()
			        })
			        .datepicker('update', this.options.selectedDate.toDate())
			        .on('changeDate', $.proxy(this._calendarSelect, this));
			}

			this._subscribeDropdown();
		},

		_buildData: function() {

            var	today = moment().startOf('day'),
    			units = this.options.numberOfDaysToShow;

			if (this.options.startWithSelected) {
				var start = this.options.selectedDate.clone(),
					end = this.options.selectedDate.clone().add('days', units);
			} else {
				var unitsPerSide = parseInt(units / 2),
					start = this.options.selectedDate.clone().subtract('days', unitsPerSide),
					end = this.options.selectedDate.clone().add('days', (units - unitsPerSide));
			}

			var data = {
				isSelectedStartDate: this.options.selectedDate.isSame(this.options.startDate) ? true : false,
				isSelectedEndDate: this.options.selectedDate.isSame(this.options.endDate) ? true : false,
				items: []
			};

			for (var m = start; m.isBefore(end); m.add('days', 1)) {

				var valid = ((m.isSame(this.options.startDate) || m.isAfter(this.options.startDate)) &&
							(m.isSame(this.options.endDate) || m.isBefore(this.options.endDate))) ? true : false;

				data.items[data.items.length] = {
					m: m.clone().format(this.options.selectedDateFormat),
					isValid: valid,
					isSelected: (m.isSame(this.options.selectedDate)) ? true : false,
					isToday: (m.isSame(today)) ? true : false,
					isOffDay: (this.options.offDays.split(',').indexOf(m.format(this.options.offDaysFormat)) !== -1) ? true : false,
					isStartOfWeek: (this.options.startOfWeek.split(',').indexOf(m.format(this.options.startOfWeekFormat)) !== -1) ? true : false,
					text: (m.isSame(this.options.selectedDate)) ? m.format(this.options.textSelected) : m.format(this.options.text),
					hint: valid ? m.format(this.options.hint) : 'Invalid date',
				};
			}

			return data;
		},

		_template: {
			wrapper: '<div class="ds-wrapper dropdown"></div>',
			field: '<button class="btn btn-primary dropdown-toggle" type="button" data-toggle="dropdown"><span class="caret"></span></button>',
			list: '<ul class="dropdown-menu" role="menu"></ul>',
			listDivider: '<li role="presentation" class="divider"></li>',
			listItem: '<li role="presentation"></li>',
			navItem: '<a role="menuitem" tabindex="-1" href="#" class="ds-nav"></a>',
			dateItem: '<a role="menuitem" tabindex="-1" href="#" class="ds-item"></a>',
			icon: '<i class="glyphicon"></i>',
			calendar: '<i id="ds-calendar" class="glyphicon glyphicon-calendar"></i>'
		},
	};

	var logError = function(message) {
        if(window.console) {
            window.console.error(message);
        }
    };

	// Prevent against multiple instantiations,
	// handle updates and method calls
	$.fn[pluginName] = function(options, args) {
		return this.each(function() {
			var self = $.data(this, 'plugin_' + pluginName);
			if (typeof options === 'string') {
				if (!self) {
					logError('Not initialized, can not call method : ' + options);
				}
				else if (!$.isFunction(self[options]) || options.charAt(0) === '_') {
					logError('No such method : ' + options);
				}
				else {
					if (typeof args === 'string') {
						args = [args];
					}
					self[options].apply(self, args);
				}
			}
			else {
				if (!self) {
					$.data(this, 'plugin_' + pluginName, new DaySelect(this, options));
				}
				else {
					self._init(options);
				}
			}
		});
	};

})(jQuery, window, document);
