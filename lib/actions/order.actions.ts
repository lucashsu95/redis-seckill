'use server'

import { deleteOrder, getUserOrders } from "@/lib/data"
import { revalidatePath } from "next/cache"

export async function deleteOrderAction(orderId: string) {
  try {
    await deleteOrder(orderId)
    revalidatePath('/admin')
    return { success: true }
  } catch (e) {
    return { success: false, error: "deleteOrderAction Failed" }
  }
}

export async function getUserOrdersAction(userId: string) {
  try {
    const orders = await getUserOrders(userId)
    return { success: true, orders }
  } catch (e) {
    return { success: false, error: "Failed to fetch user orders" }
  }
}