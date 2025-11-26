'use server'

import { deleteOrder } from "@/lib/data"
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