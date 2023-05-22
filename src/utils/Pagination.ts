interface pagination {
  total?: number
  count?: number
  perPage?: number
  currentPage?: number
  totalPages?: number
}

export interface IPaginationRequest {
  perPage: number;
  page: number;
}

class Pagination {
  data;
  perPage;
  page;
  pagination: pagination = {};
  
  constructor(data: any, perPage: number, page: number) {
      this.data = data
      this.perPage = perPage
      this.page = page

      this.setup()
  }

  setup() {
      if(!isNaN(this.perPage)) {
        const totalPages = Math.ceil(this.data.total / this.perPage)

        this.pagination = {
            total: parseInt(this.data.total),
            count: this.data.results.length,
            perPage: this.perPage,
            currentPage: this.page,
            totalPages: totalPages,
        }
      }
  }

  get() {
      return {
          data: this.data.results,
          pagination: this.pagination,
      }
  }
}

export default Pagination;