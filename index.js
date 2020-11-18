const { Builder, By, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const axios = require('axios');
const cheerio = require('cheerio')
const FormData = require('form-data')
const orders_placed = []
const temp_orders = []

const header = {
    "accept": "application/json, text/javascript, */*; q=0.01",
    "accept-encoding": "gzip, deflate, br",
    "accept-language": "he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.183 Safari/537.36",
    "x-requested-with": "XMLHttpRequest"
}


async function get_order(orderNumber) {
    try {
        const response = await axios.get('https://www.10bis.co.il/reshome/Orders/Standard?id=' + orderNumber, { headers: header })
        let r = response.data

         if (r.DeliveryMethod == 'Pickup') throw 'פיקאפ'

        let addr = await get_address(r.DeliveryAddress.AddressLine)

        name = r.User.Name.split(' ')

        var new_order = {
            storeOrderNum: r.OrderID,
            source: "tenbis",
            firstName: name.shift(),
            lastName: name.join(' '),
            phone: r.User.Phone01,
            phone2: r.User.Phone02,
            email: r.User.Email,
            city: addr.city,
            street: addr.street,
            building: addr.house || 1,
            apartment: r.DeliveryAddress.ApartementNumber || 1,
            entrance: r.DeliveryAddress.Entrance,
            floor: r.DeliveryAddress.Floor,
            addressComment: r.DeliveryAddress.AddressRemarks,
            cashSum: r.Payment.CashPayment,
            finalSum: r.Payment.TotalPriceToCharge,
            sum: r.Payment.TotalPriceToCharge,
            deliveryPrice: r.Payment.DeliveryPrice,
            timeline: {
                new: r.SubmitTime.split(/(\d+)/)[1]
            }
        }
        console.log(new_order)

        await axios.post('https://www.skip-il.com/yg', {
            data: {
                ...new_order,
                storeId: '7254',
                at: 'JMm8LXW9mgpGL3EF'
            },
            q: 'order:newDelivery'
        })

    } catch (error) {
        
    }
}

const UserName = 'tp9z5pq'
const Password = 'sn8x5p4'
async function login() {
    const data = new FormData()

    data.append('UserName', UserName)
    data.append('Password', Password)
    data.append('RememberMe', 'true')

    const config = {
        method: 'post',
        url: 'https://www.10bis.co.il/reshome/Account/LogOn?isMobileDevice=true',
        headers: {
            ...header,
            ...data.getHeaders()
        },
        data: data
    }

    try {
        const
            response = await axios(config),
            $ = cheerio.load(response.data)

        $(".tableRow a").each(function (i, e) {
            temp_orders[i] = $(this).text()
        })
    } catch {
        delete header.cookie
    }
}

async function get_address(addr) {
    a = addr.split(",")

    var a1 = a[0].split(/(\d+)/)
    var a2 = a[1]

    var c = a2.trim();

    return {
        city: c,
        street: a1[0].trim(),
        house: a1[1],
    }
}

async function get_cookies() {
        let driver = await new Builder().forBrowser('chrome')
        .setChromeOptions(new chrome.Options().addArguments(['--headless','--no-sandbox', '--disable-dev-shm-usage']))
        .build();
    try {
        await driver.get('https://www.10bis.co.il/reshome/Account/LogOn?ReturnUrl=%2freshome%2f&isMobileDevice=true');
        await driver.findElement(By.id('UserName')).sendKeys('tp9z5pq', Key.RETURN);
        await driver.findElement(By.id('Password')).sendKeys('sn8x5p4', Key.RETURN);
        // await driver.findElement(By.xpath('button[type=submit]')).contextClick();
        cookies = await driver.manage().getCookies();
        let cook = ''
        for (i of cookies) {
            cook += `${i.name}=${i.value};`
        }
        return cook;

    } finally {
        await driver.quit();
    }
}


(async function start() {
    if (!header.cookie) {
        cookie = await get_cookies()
        header.cookie = cookie
    }

    await login()

    const Promises = []
    temp_orders
        .filter(orderNumber => !orders_placed.includes(orderNumber))
        .forEach(orderNumber => {
            Promises.push(get_order(orderNumber))
        })
        try {
            console.log('start')
            const results = await Promise.all(Promises)
        } catch (error) {
            console.log('error',error)
            
        }
    

})();