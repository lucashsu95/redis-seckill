import { getGlobalOrders, getProducts } from "@/lib/data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Force dynamic since we are fetching live data
export const dynamic = "force-dynamic"

export default async function AdminPage() {
  const [products, { orders, total }] = await Promise.all([
    getProducts(),
    getGlobalOrders(1, 50), // Fetch first 50 orders
  ])

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <Badge variant="outline" className="text-sm py-1 px-3">
          Redis Powered
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${orders.reduce((acc, curr) => acc + curr.price, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="products" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="orders">Recent Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>Product Inventory</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Image</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-mono text-xs">{product.id}</TableCell>
                      <TableCell>
                        <div className="h-10 w-10 relative overflow-hidden rounded">
                          <img
                            src={product.image || "/placeholder.svg"}
                            alt={product.name}
                            className="object-cover w-full h-full"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>${product.price}</TableCell>
                      <TableCell>
                        <span className={product.stock < 10 ? "text-red-500 font-bold" : ""}>{product.stock}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={product.stock > 0 ? "default" : "destructive"}>
                          {product.stock > 0 ? "In Stock" : "Sold Out"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {products.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                        No products found. Run the seed script?
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Global Order Log</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>Product ID</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs">{order.id.slice(0, 8)}...</TableCell>
                      <TableCell className="text-xs">{order.userId}</TableCell>
                      <TableCell className="text-xs">{order.productId}</TableCell>
                      <TableCell>${order.price}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          {order.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {orders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                        No orders processed yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
