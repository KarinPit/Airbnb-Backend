import { stayService } from './services/stay.service.js'
import { orderService } from './services/order.service.js'
import { userService } from './services/user.service.js'
import { utilService } from './services/util.service.js'

console.log('Simple driver to test some API calls')

window.onLoadStays = onLoadStays
window.onLoadUsers = onLoadUsers
window.onAddStay = onAddStay
window.onGetStayById = onGetStayById
window.onRemoveStay = onRemoveStay
window.onAddStayMsg = onAddStayMsg

window.onLoadOrders = onLoadOrders
window.onLoadUsers = onLoadUsers
window.onAddOrder = onAddOrder
window.onGetOrderById = onGetOrderById
window.onRemoveOrder = onRemoveOrder
window.onAddOrderMsg = onAddOrderMsg

async function onLoadStays() {
    const stays = await stayService.query()
    render('Stays', stays)
}
async function onLoadUsers() {
    const users = await userService.query()
    render('Users', users)
}

async function onGetStayById() {
    const id = prompt('Stay id?')
    if (!id) return
    const stay = await stayService.getById(id)
    render('Stay', stay)
}

async function onRemoveStay() {
    const id = prompt('Stay id?')
    if (!id) return
    await stayService.remove(id)
    render('Removed Stay')
}

async function onAddStay() {
    await userService.login({ username: 'puki', password: '123' })
    const savedStay = await stayService.save(stayService.getEmptyStay())
    render('Saved Stay', savedStay)
}

async function onAddStayMsg() {
    await userService.login({ username: 'puki', password: '123' })
    const id = prompt('Stay id?')
    if (!id) return

    const savedMsg = await stayService.addStayMsg(id, 'some msg')
    render('Saved Msg', savedMsg)
}

function render(title, mix = '') {
    console.log(title, mix)
    const output = utilService.prettyJSON(mix)
    document.querySelector('h2').innerText = title
    document.querySelector('pre').innerHTML = output
}


async function onLoadOrders() {
    const orders = await orderService.query()
    render('Orders', orders)
}
async function onLoadUsers() {
    const users = await userService.query()
    render('Users', users)
}

async function onGetOrderById() {
    const id = prompt('Order id?')
    if (!id) return
    const order = await orderService.getById(id)
    render('Order', order)
}

async function onRemoveOrder() {
    const id = prompt('Order id?')
    if (!id) return
    await orderService.remove(id)
    render('Removed Order')
}

async function onAddOrder() {
    await userService.login({ username: 'puki', password: '123' })
    const savedOrder = await orderService.save(orderService.getEmptyOrder())
    render('Saved Order', savedOrder)
}

async function onAddOrderMsg() {
    await userService.login({ username: 'puki', password: '123' })
    const id = prompt('Order id?')
    if (!id) return

    const savedMsg = await orderService.addOrderMsg(id, 'some msg')
    render('Saved Msg', savedMsg)
}

function render(title, mix = '') {
    console.log(title, mix)
    const output = utilService.prettyJSON(mix)
    document.querySelector('h2').innerText = title
    document.querySelector('pre').innerHTML = output
}

