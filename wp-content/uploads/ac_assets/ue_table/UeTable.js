export default class UeTable {
  constructor(options) {
      this.items = options.items
      this.containerEl = options.containerEl
      this.config = options.config
      this.filtering = options.config.filtering
      this.toolsbar = options.config.toolsbar
	  this.grouping = options.config.grouping
      this.guid = options.guid
      this.wrapper = options.wrapper

      this.headerData = []
      this.tableData = []
      this.activeFilter = []
	  this.images = []
	  this.imagePromises = []
	  this.rows = []
	  this.cells = []
	  this.cols = this.items.filter( item => item.item_type == 'header')

	  if ( this.config.responsiveLayout == 'collapse' ) {	
	  	this.headerData.push({formatter:"responsiveCollapse", width: 100, minWidth: 60, hozAlign:"center", resizable:false, headerSort:false})
	  }

	  this.isTouchDevice = 'ontouchstart' in window ? true : false

      this.init()
  }

  init() {

      this.initTableData()
      this.createTable()
  }

  initTableData() {
      let colIdx = 0
      let currentRow = {}
      this.items.forEach( (item, index) => {
		  
          colIdx++
          switch(item.item_type) {
    
            case 'header':
				
              const headerItem = {}

			  //headerItem.dataValue = item.header_value

              if (item.use_header_icon) {
                headerItem.title = `<span class="ue-table-header__icon">${item.header_icon_html}</span> ${item.header_value}`
              } else {
                headerItem.title = item.header_value
              }
              headerItem.field = `column-${colIdx}`
			  headerItem.visible = item.header_invisible == 'true' ? false : true

			  if ( window.matchMedia('(max-width: 767px)').matches ) {
				headerItem.minWidth = Number(item.column_width_mobile_nounit)
			  } else if ( window.matchMedia('(max-width: 1025px)').matches ) {
				headerItem.minWidth = Number(item.column_width_tablet_nounit)
			  } else {
				headerItem.minWidth = Number(item.column_width_nounit)
			  }  

              headerItem.formatter = 'html'
			  headerItem.cssClass = item.item_repeater_class
              headerItem.headerVertical = this.config.headerVertical
              if (this.filtering.isEnabled && this.filtering.filterType == 'header' ) headerItem.headerFilter = true
			  headerItem.headerSort = item.header_enable_column_sorting === 'true' ? true : false
			  headerItem.variableHeight = true
			  headerItem.vertAlign = this.config.cellVerticalAlignment

		
			  
                if ( this.config.resizable == 'true' || this.config.resizable == 'false' ) {
                    headerItem.resizable = JSON.parse(this.config.resizable)
                } else {
                  headerItem.resizable = this.config.resizable
                }
			  

              this.headerData.push(headerItem)
              break;
    
            case 'row':
              if ( Object.keys(currentRow).length !== 0 ) {
                  this.tableData.push(currentRow)
                  currentRow = {}
              }
			  this.rows.push(`${item.item_repeater_class}`)
              colIdx = 0
              break;
    
            case 'column':
	
              const args = {
                writable: true,
                enumerable: true,
                configurable: true
              }
              switch ( item.column_content_type) {
                case 'icon':
                  args.value = `<div class="ue-table-column__icon">${item.column_icon_html}</div>`
					/*args.value = item.column_icon_html*/
                  break
                case 'text-area':
                  args.value = item.column_text
                  break
                case 'editor':
                  args.value = item.column_editor
                  break
				case 'image':
				  this.images.push(item.column_image)
                  args.value = `<img class="ue-table-column__image" src="${item.column_image}" />`
                  break
				case 'button':
                  args.value = `<a href="${item.column_button_link}" ${item.column_button_link_html_attributes} class="ue-table-column__button">${item.column_button_text}</a>`
                  break
                case 'template':
                  args.value = document.querySelector(`#${this.guid} .ue-table__templates-item[data-index="${index+1}"]`).innerHTML
                  break
              }
			  if ( args.value == '') args.value = ' '
              if ( args.value ) Object.defineProperty(currentRow, `column-${colIdx}` , args)
              if ( index == this.items.length - 1 ) this.tableData.push(currentRow)
              break;
          }
      })
  }

  createTable() {


    this.table = new Tabulator(this.containerEl, {
        data: this.tableData, 
        columns: this.headerData,         
        layout: this.config.layout,
		height: this.config.height,
        responsiveLayout: this.config.responsiveLayout,
		responsiveLayoutCollapseStartOpen: this.config.responsiveLayoutCollapseStartOpen,
        resizableColumnFit: this.config.resizableColumnFit,
        clipboard: 'copy',
        printAsHtml: true,
        printStyled: true,
		rowFormatter: (row) => {
			const position = row.getPosition()
			const rowEl = row.getElement()
			rowEl.classList.add(this.rows[position-1])
			row.getCells().forEach( cell => {
				const cellEl = cell.getElement()
				cellEl.classList = ''
				cellEl.classList.add('tabulator-cell')
			})
        }
    })



    this.table.on('tableBuilt', e => {
      this.initOptionals()
      this.initEvents()
	  if ( this.images.length > 0 ) {
		this.loadImages()
        Promise.all(this.imagePromises).then( () => {
          this.table.rowManager.rows.forEach ( row => {
            row.component.normalizeHeight()
          })
          this.wrapper.classList.add('uc-show')
	    })
	  } else {
		this.wrapper.classList.add('uc-show')
      }
    })
  }

  loadImages() {
	this.images.forEach( imgSrc => {
      this.imagePromises.push( 
        new Promise( (resolve, reject) => {
          const image = new Image()
          image.src = imgSrc
          image.onload = () => resolve(image)
          image.onerror = (e) => reject(e)
        })
      )
    })
  }

  initOptionals() {
    if (this.filtering.isEnabled && this.filtering.filterType == 'toolbar' ) this.initFilter()
	this.initGrouping() 
  }

  initGrouping() {
	if (this.grouping.enableGrouping) {
      if ( this.grouping.applyBreakpoint ) {
          if ( window.matchMedia(`(max-width: ${this.grouping.breakpoint})`).matches ) {
              this.setGrouping()
		  } else {
			this.table.setGroupBy('')
		  }
      } else {
		this.setGrouping()
	  }
	}
  }

  setGrouping() {

	this.table.setGroupBy(`column-${this.grouping.columnID}`)
	

	for( const key in Object.entries(this.table.getGroups()) ) {     
        this.table.getGroups()[key].hide()
    }
	switch (this.grouping.defaultState) {
		case 'expand_all':
			for( const key in Object.entries(this.table.getGroups()) ) {     
                this.table.getGroups()[key].show()
            }
			break
		case 'expand_first':
			this.table.getGroups()[0].show()
			break
		default:
			break
	}
  }

  initFilter() {
    this.createFilterFieldsList()
    this.filterFields = this.filtering.filterColumns.querySelectorAll('li')
  }

  createFilterFieldsList() {
    const columns = this.table.getColumnDefinitions()
    columns.forEach( (col, index) => {
      const li = document.createElement('li')
      li.setAttribute('role', 'option')
      li.setAttribute('aria-checked', 'true')
      li.setAttribute('aria-selected', 'false')
      li.setAttribute('tabindex', '-1')
      li.setAttribute('data-field-name', col.field)

      const checkbox = document.createElement('input')
      checkbox.setAttribute('type', 'checkbox')
      checkbox.setAttribute('tabindex', '-1')
      checkbox.id = `${col.field}_${this.guid}`
      checkbox.checked = true
      
      const label = document.createElement('label')
      label.setAttribute('for', `${col.field}_${this.guid}`)
      label.textContent = this.headerData[index].title

      li.append(checkbox)
      li.append(label)
      this.filtering.filterColumns.append(li)

      this.activeFilter.push(col.field)
      this.initFilterFieldEventHandler(checkbox)

    })

    this.filtering.filterColumns.style.top = `${this.filtering.searchFieldEl.clientHeight + 5}px`
  }

  initEventHandlers() {
    if (this.filtering.isEnabled && this.filtering.filterType == 'toolbar') {
      this.initFilterToggleEventHandler()
      this.initFilterSearch()
    }
    if (this.toolsbar.copy.isEnabled) this.initCopyEventHandler()
    if (this.toolsbar.print.isEnabled) this.initPrintEventHandler()
    if (this.toolsbar.download.isEnabled) this.initDownloadEventHandler()
  }

  initFilterToggleEventHandler() {
    this.filtering.columnsToggleEl.addEventListener('click', this.onToggleFilterFields.bind(this))
  }

  onToggleFilterFields() {
    this.filtering.filterColumns.classList.toggle('uc-show')
  }

  initFilterSearch() {
    this.filtering.searchFieldEl.addEventListener('keyup', this.onFilterSearch.bind(this))
    this.filtering.searchBtnEl.addEventListener('click', this.onFilterSearch.bind(this))
  }

  onFilterSearch(e) {
    this.table.setFilter(this.searchFilter, {value:e.target.value, activeFilter: this.activeFilter})
    if(e.target.value == '') this.table.clearFilter()
  }

  initFilterFieldEventHandler(checkbox) {
    checkbox.addEventListener("click", (e) => {
      const fieldName = e.target.parentElement.dataset.fieldName
      if(e.target.checked){
          e.target.parentElement.setAttribute("aria-checked", "true");
          if(!this.activeFilter.includes(fieldName)) {
            this.activeFilter.push(fieldName)
          }
      }
      else{
          e.target.parentElement.setAttribute("aria-checked", "false");
          if(this.activeFilter.includes(fieldName)) {
            this.activeFilter.splice(this.activeFilter.indexOf(fieldName), 1)
          }
      }
      e.stopPropagation();
    })
  }

  searchFilter(data, filterParams) {
    var match = false;
    const regex = RegExp(filterParams.value, 'i');

    for (var key in data) {
        if ( filterParams.activeFilter.includes(key) && regex.test(data[key]) == true) {
            match = true;
        }
    }
    return match;
  }

  initCopyEventHandler() {
    this.toolsbar.copy.copyBtnEl.addEventListener('click', e => {
      this.table.copyToClipboard('all')
    }) 
  }

  initPrintEventHandler() {
    this.toolsbar.print.printBtnEl.addEventListener('click', e => { 
      this.table.print(false, true)
    })
  }

  initDownloadEventHandler() {
    this.toolsbar.download.downloadBtnEl.addEventListener('click', e => { 
      this.table.download('csv', `${window.document.title}.csv`)
    })
  }

  onResize() {
	this.table.destroy()
  }

recreateTable() {
	this.headerData = []
      this.tableData = []
	if ( this.config.responsiveLayout == 'collapse' ) {	
	  	this.headerData.push({formatter:"responsiveCollapse", width:30, minWidth:30, hozAlign:"center", resizable:false, headerSort:false})
	  }
	this.init()
}

  initEvents() {
		this.initEventHandlers()
      if (!this.isTouchDevice) window.addEventListener('resize', this.onResize.bind(this))
	this.table.on('tableDestroyed', this.recreateTable.bind(this))
  }
}