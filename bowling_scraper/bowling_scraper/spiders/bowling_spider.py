import scrapy
import csv 

class BowlingSpider(scrapy.Spider):
    name = 'bowling_spider'
    # crawl_pages = [
    #     'https://www.bowwwl.com/bowling-ball-database?weight=12&overseas=All&discontinued=All',
    #     'https://www.bowwwl.com/bowling-ball-database?weight=13&overseas=All&discontinued=All',
    #     'https://www.bowwwl.com/bowling-ball-database?weight=14&overseas=All&discontinued=All',
    #     'https://www.bowwwl.com/bowling-ball-database?weight=15&overseas=All&discontinued=All',
    #     'https://www.bowwwl.com/bowling-ball-database?weight=16&overseas=All&discontinued=All']

    # def start_requests(self): 
    #     for url in self.crawl_pages: 
    #         yield scrapy.Request(url=url, callback=self.extract_website)

    
    # def extract_website(self, response):
    #     # page = response.meta['page']
    #     # print (f'Processing page: {page}')

    #     urls = response.xpath ('//td[@class="views-field views-field-nothing-2"]//a/@href').getall()

    #     for url in urls:
    #         yield {'url': response.urljoin(url)}
    #     # # Follow pagination links
    #     next_page = response.xpath ('//li[@class="page-item"]//a[@rel = "next"]/@href').get()
    #     # print (next_page)
    #     # print (response.urljoin(next_page))
    #     if next_page:  
    #         next_page_url = response.urljoin(next_page)
    #         yield scrapy.Request(url=next_page_url, callback=self.extract_website)

    def start_requests(self):
        with open('bowling_ball_urls_unique.csv',newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                yield scrapy.Request(
                    url=row['url'].strip(),
                    callback=self.parse_page
                )
            

    def parse_page (self, response):
        
        item = {}
        item['url'] = response.url
        item['image_url'] = response.xpath ('//div[@class = "float-sm-end ball-image"]/div/div/picture//source[@type="image/png"]/@srcset').get()
        item['brand_url'] = response.xpath ('//div[contains(@class,"field--name-field-brand")]//a/@href').get()

        item ['release_date'] = response.xpath(
            '//div[contains(@class , "field--name-field-release-date")]//div[@class = "field__item"]/time/text()'
            ).get()
        
        item['discontinued'] = (
            response.xpath(
                '//div[contains(@class,"field--name-field-discontinued")]//strong/text()'
            ).get() == 'Discontinued'
        )

        item['overseas'] = bool(
            response.xpath(
                '//div[contains(@class,"field--name-field-international")]//strong/text()'
            ).get()
        )
        summary = response.xpath('//div[contains(@class,"field--type-text-with-summary")]//p/text()').getall()
        if len(summary):
            item ['summary'] = ' '.join(summary)
        else:
            item ['summary'] = "N/A"

        item['factory_finish'] = response.xpath('//div[contains(@class,"field--name-field-factory-finish")]//div[@class = "field__item"]/text()').get()
        
        coverstock_path = '//div[contains(@class,"field--name-field-coverstock")]'
        item['coverstock'] = response.xpath(coverstock_path + '//a/text()').get()
        
        coverstock_description = response.xpath(coverstock_path + '//div[@class = "clearfix text-formatted field field--name-description field--type-text-long field--label-hidden field__item"]/p/text()').getall()
        if len(coverstock_description):
            item['coverstock_description'] = ' '.join(coverstock_description)
        else:
            item['coverstock_description'] = "N/A"
        item['coverstock_type'] = response.xpath(coverstock_path +'//div[@class = "field__item"]/text()').get()

        core_path = '//div[contains(@class,"field--name-field-core")]'
        
        item ['core'] = response.xpath(core_path + '//a/text()').get()
        
        core_summary = response.xpath(
            core_path + '//div[contains(@class,"field--type-text-with-summary")]//p/text()').getall()
        if len(core_summary):
            item['core_summary'] = ' '.join(core_summary)
        else:
            item['core_summary'] = "N/A"
        item['core_type'] = response.xpath(
            core_path + '//div[contains(@class,"field--name-field-core-type")]//div[@class = "field__item"]/text()'
            ).get()     

        core_specs = core_path + '//div[contains(@class,"field--name-field-core-specs")]//div[@class = "field__items row"]'   
        item['spec_12'] = {'RG':"NULL", 'Diff':"NULL", 'MB Diff':"NULL"}
        item['spec_13'] = {'RG':"NULL", 'Diff':"NULL", 'MB Diff':"NULL"}
        item['spec_14'] = {'RG':"NULL", 'Diff':"NULL", 'MB Diff':"NULL"}
        item['spec_15'] = {'RG':"NULL", 'Diff':"NULL", 'MB Diff':"NULL"}
        item['spec_16'] = {'RG':"NULL", 'Diff':"NULL", 'MB Diff':"NULL"}
        core_specs_xpath = core_path + '//div[contains(@class,"field--name-field-core-specs")]//div[contains(@class,"card-body")]'

        for spec in response.xpath(core_specs_xpath):
            weight_text = spec.xpath('.//h6[contains(@class,"card-title")]/text()').get()
            if not weight_text:
                continue
            weight = weight_text.strip().split()[0]

            rg = spec.xpath('.//div[contains(@class,"field--name-field-rg")]//div[@class="field__item"]/text()').get()
            diff = spec.xpath('.//div[contains(@class,"field--name-field-differential")]//div[@class="field__item"]/text()').get()
            mb_diff = spec.xpath('.//div[contains(@class,"field--name-field-mass-bias-differential")]//div[@class="field__item"]/text()').get()

            # convert to float if exists
            rg = float(rg) if rg else None
            diff = float(diff) if diff else None
            mb_diff = float(mb_diff) if mb_diff else None

            # store
            item[f'spec_{weight}'] = {'RG': rg, 'Diff': diff, 'MB Diff': mb_diff}


        yield item