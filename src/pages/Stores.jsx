
import { useEffect, useState, useRef } from 'react'

function Stores() {
  const [stores, setStores] = useState([])
  const [selectedStore, setSelectedStore] = useState(null)
  const [storeItems, setStoreItems] = useState([])
  const [inventoryError, setInventoryError] = useState('')
  const [inventoryLoading, setInventoryLoading] = useState(false)
  const [newStockCount, setNewStockCount] = useState('0')
  const [editingInventoryId, setEditingInventoryId] = useState(null)
  const [editingStockCount, setEditingStockCount] = useState('')
  const [items, setItems] = useState([])
  const [itemName, setItemName] = useState('')
  const [itemPrice, setItemPrice] = useState('')
  const [itemError, setItemError] = useState('')
  const [itemSuccess, setItemSuccess] = useState('')
  const [editingItemId, setEditingItemId] = useState(null)
  const [editingItemName, setEditingItemName] = useState('')
  const [editingItemPrice, setEditingItemPrice] = useState('')
  const editItemRef = useRef(null)
  const [newItemName, setNewItemName] = useState('')
  const [newItemPrice, setNewItemPrice] = useState('')
  const [editingPriceId, setEditingPriceId] = useState(null)
  const [editingPrice, setEditingPrice] = useState('')
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')

  const emptyForm = {
    StoreID: '',
    Name: '',
    Type: '',
    Location: ''
  }

  const [form, setForm] = useState(emptyForm)

  async function loadStores() {
    try {
      const response = await fetch('/api/stores')

      if (!response.ok) {
        throw new Error('Failed to load stores')
      }

      const data = await response.json()
      setStores(data)
      setError('')
    } catch (error) {
      setError(error.message)
    }
  }


async function loadItems() {
  try {
    const response = await fetch('/api/items', {
      credentials: 'include'
    })

    if (!response.ok) {
      throw new Error('Failed to load items')
    }

    const data = await response.json()
    setItems(data)
    setItemError('')
  } catch (error) {
    setItemError(error.message)
  }
}

async function loadStoreItems(storeID) {
  setInventoryLoading(true)
  setInventoryError('')

  try {
    const response = await fetch(
      `/api/stores/${storeID}/items`,
      { credentials: 'include' }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to load store inventory')
    }

    setStoreItems(data)
  } catch (error) {
    setInventoryError(error.message)
    setStoreItems([])
  } finally {
    setInventoryLoading(false)
  }
}


async function addItemToStore(event) {
  event.preventDefault()

  try {
    const response = await fetch(
      `/api/stores/${selectedStore.StoreID}/items`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          Name: newItemName.trim(),
          Price: Number(newItemPrice),
          StockCount: Number(newStockCount),
        }),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to add item.')
    }

    setNewItemName('')
    setNewItemPrice('')
    setNewStockCount('0')
    setInventoryError('')

    await loadStoreItems(selectedStore.StoreID)
  } catch (error) {
    setInventoryError(error.message)
  }
}


async function saveItemPrice(itemID) {
  try {
    if (editingPrice === '' || !Number.isFinite(Number(editingPrice)) ||
        Number(editingPrice) < 0) {
      setInventoryError('Enter a valid, non-negative price.')
      return
    }

    const response = await fetch(
      `/api/items/${itemID}/price`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ Price: Number(editingPrice) }),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to update price.')
    }

    setInventoryError('')
    setEditingPriceId(null)

    await loadStoreItems(selectedStore.StoreID)
  } catch (error) {
    setInventoryError(error.message)
  }
}


async function saveInventoryStock(itemID) {
  setInventoryError('')

  const stockCount = Number(editingStockCount)

  if (
    editingStockCount.trim() === '' ||
    !Number.isInteger(stockCount) ||
    stockCount < 0
  ) {
    setInventoryError('Stock count must be a non-negative whole number.')
    return
  }

  try {
    const response = await fetch(
      `/api/stores/${selectedStore.StoreID}/items/${itemID}`,
      {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ StockCount: stockCount })
      }
    )

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to update stock')
    }

    setEditingInventoryId(null)
    setEditingStockCount('')
    await loadStoreItems(selectedStore.StoreID)
  } catch (error) {
    setInventoryError(error.message)
  }
}

async function removeInventoryItem(itemID) {
  if (
    !window.confirm(
      "Remove this item from this store? The item itself will not be deleted."
    )
  ) {
    return
  }

  setInventoryError('')

  try {
    const response = await fetch(
      `/api/stores/${selectedStore.StoreID}/items/${itemID}`,
      {
        method: 'DELETE',
        credentials: 'include'
      }
    )

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to remove item')
    }

    if (editingInventoryId === itemID) {
      setEditingInventoryId(null)
      setEditingStockCount('')
    }

    await loadStoreItems(selectedStore.StoreID)
  } catch (error) {
    setInventoryError(error.message)
  }
}



  useEffect(() => {
    loadStores()
    loadItems()
  }, [])

  function handleChange(event) {
    const { name, value } = event.target
    setForm({ ...form, [name]: value })
  }

  function resetForm() {
    setForm({ ...emptyForm })
    setEditingId(null)
  }

  async function saveStore(event) {
    event.preventDefault()
    setError('')

    const store = {
      StoreID: Number(form.StoreID),
      Name: form.Name.trim(),
      Type: form.Type.trim(),
      Location: form.Location.trim() || null
    }

    if (!store.StoreID || !store.Name || !store.Type) {
      setError('Store ID, name, and type are required.')
      return
    }

    try {
      const response = await fetch(
        editingId !== null
          ? `/api/stores/${editingId}`
          : '/api/stores',
        {
          method: editingId !== null ? 'PUT' : 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(store)
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save store')
      }

      resetForm()
      await loadStores()
    } catch (error) {
      setError(error.message)
    }
  }


async function addItem(event) {
  event.preventDefault()
  setItemError('')
  setItemSuccess('')

  const price = itemPrice.trim() === '' ? null : Number(itemPrice)

  if (!itemName.trim()) {
    setItemError('Item name is required.')
    return
  }

  if (price !== null && (!Number.isFinite(price) || price < 0)) {
    setItemError('Price must be a non-negative number.')
    return
  }

  try {
    const response = await fetch('/api/items', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        Name: itemName.trim(),
        Price: price
      })
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to add item')
    }

    setItemName('')
    setItemPrice('')
    setItemSuccess('Item added successfully.')
    await loadItems()
  } catch (error) {
    setItemError(error.message)
  }
}

function startEditingItem(item) {
  setEditingItemId(item.ItemID)
  setEditingItemName(item.Name || '')
  setEditingItemPrice(item.Price == null ? '' : String(item.Price))
  setTimeout(() => {
    editItemRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    })
  }, 100)
}

async function saveItemEdit(event) {
  event.preventDefault()
  setItemError('')
  setItemSuccess('')

  const price =
    editingItemPrice.trim() === '' ? null : Number(editingItemPrice)

  if (!editingItemName.trim()) {
    setItemError('Item name is required.')
    return
  }

  if (price !== null && (!Number.isFinite(price) || price < 0)) {
    setItemError('Price must be a non-negative number.')
    return
  }

  try {
    const response = await fetch(
      `/api/items/${editingItemId}`,
      {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          Name: editingItemName.trim(),
          Price: price
        })
      }
    )

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to update item')
    }

    setEditingItemId(null)
    setEditingItemName('')
    setEditingItemPrice('')
    setItemSuccess('Item updated successfully.')
    await loadItems()
  } catch (error) {
    setItemError(error.message)
  }
}


async function deleteItem(id) {
  if (!window.confirm('Are you sure you want to delete this item?')) {
    return
  }

  setItemError('')
  setItemSuccess('')

  try {
    const response = await fetch(`/api/items/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to delete item')
    }

    setItemSuccess('Item deleted successfully.')
    await loadItems()
  } catch (error) {
    setItemError(error.message)
  }
}


  function startEditing(store) {
    setEditingId(store.StoreID)
    setForm({
      StoreID: String(store.StoreID),
      Name: store.Name || '',
      Type: store.Type || '',
      Location: store.Location || ''
    })

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function deleteStore(id) {
    if (!window.confirm('Are you sure you want to delete this store?')) {
      return
    }

    setError('')

    try {
      const response = await fetch(
        `/api/stores/${id}`,
        {
          method: 'DELETE',
          credentials: 'include'
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete store')
      }

      if (editingId === id) {
        resetForm()
      }

      await loadStores()
    } catch (error) {
      setError(error.message)
    }
  }

  const filteredStores = stores.filter((store) =>
    `${store.StoreID} ${store.Name} ${store.Type} ${store.Location || ''}`
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  return (
    <div className="galleries-page">
      <h2>Manage Stores</h2>

      {error && <p className="error-message">{error}</p>}

      <form className="gallery-form" onSubmit={saveStore}>
        <h3>{editingId !== null ? 'Edit Store' : 'Add Store'}</h3>

        <div className="gallery-form-grid">
          <div className="gallery-field">
            <label htmlFor="StoreID">Store ID</label>
            <input
              id="StoreID"
              name="StoreID"
              type="number"
              min="1"
              value={form.StoreID}
              onChange={handleChange}
              disabled={editingId !== null}
              required
            />
          </div>

          <div className="gallery-field">
            <label htmlFor="Name">Store Name</label>
            <input
              id="Name"
              name="Name"
              value={form.Name}
              onChange={handleChange}
              maxLength="50"
              required
            />
          </div>

          <div className="gallery-field">
            <label htmlFor="Type">Store Type</label>
            <input
              id="Type"
              name="Type"
              value={form.Type}
              onChange={handleChange}
              maxLength="30"
              placeholder="e.g. Gift Shop"
              required
            />
          </div>

          <div className="gallery-field">
            <label htmlFor="Location">Location</label>
            <input
              id="Location"
              name="Location"
              value={form.Location}
              onChange={handleChange}
              maxLength="100"
              placeholder="Optional"
            />
          </div>
        </div>

        <button type="submit">
          {editingId !== null ? 'Save Changes' : 'Add Store'}
        </button>

        {editingId !== null && (
          <button type="button" onClick={resetForm}>
            Cancel
          </button>
        )}
      </form>

      <div className="gallery-section">
        <h3>Stores</h3>

        <input
          className="gallery-search"
          type="text"
          placeholder="Search stores..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <div className="gallery-list">
          {filteredStores.length === 0 ? (
            <p>No stores found.</p>
          ) : (
            filteredStores.map((store) => (
              <div
                className="gallery-card"
                key={store.StoreID}
                onClick={() => {
                  setSelectedStore(store)
                  loadStoreItems(store.StoreID)
                }}
                style={{
                  cursor: 'pointer',
                  border:
                    selectedStore?.StoreID === store.StoreID
                      ? '2px solid #2563eb'
                      : undefined
                }}
              >
                <h4>{store.Name}</h4>

                <p>
                  <strong>ID:</strong> {store.StoreID}
                </p>

                <p>
                  <strong>Type:</strong> {store.Type}
                </p>

                <p>
                  <strong>Location:</strong>{' '}
                  {store.Location || 'Not specified'}
                </p>

                <div className="gallery-card-actions">
                  <button
                    type="button"
                    onClick={() => startEditing(store)}
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    className="delete-button"
                    onClick={() => deleteStore(store.StoreID)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedStore && (
        <div className="gallery-section">
          <h3>{selectedStore.Name} — Inventory</h3>
          
          <form className="gallery-form" onSubmit={addItemToStore}>
            <h4>Add New Item to This Store</h4>

            <div className="gallery-form-grid">
              <div className="gallery-field">
                <label htmlFor="newItemName">Item Name</label>
                <input
                  id="newItemName"
                  type="text"
                  value={newItemName}
                  onChange={(event) => setNewItemName(event.target.value)}
                  required
                />
              </div>

              <div className="gallery-field">
                <label htmlFor="newItemPrice">Price</label>
                <input
                  id="newItemPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={newItemPrice}
                  onChange={(event) => setNewItemPrice(event.target.value)}
                  required
                />
              </div>

              <div className="gallery-field">
                <label htmlFor="newStockCount">Stock Count</label>
                <input
                  id="newStockCount"
                  type="number"
                  min="0"
                  step="1"
                  value={newStockCount}
                  onChange={(event) => setNewStockCount(event.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit">Add Item</button>
          </form>

          {inventoryError && (
            <p className="error-message">{inventoryError}</p>
          )}

          {inventoryLoading ? (
            <p>Loading inventory...</p>
          ) : storeItems.length === 0 ? (
            <p>No items assigned to this store yet.</p>
          ) : (
            <div className="gallery-list">
              {storeItems.map((item) => (
                <div className="gallery-card" key={item.ItemID}>
                  <h4>{item.Name}</h4>

                  <p>
                    <strong>Item ID:</strong> {item.ItemID}
                  </p>

                  <p>
                    <strong>Price:</strong>{' '}
                    {item.Price == null
                      ? 'Not specified'
                      : `$${Number(item.Price).toFixed(2)}`}
                  </p>
                    
                  {editingInventoryId === item.ItemID ? (
                    <div className="gallery-field">
                      <label htmlFor={`stock-${item.ItemID}`}>Stock Count</label>
                      <input
                        id={`stock-${item.ItemID}`}
                        type="number"
                        min="0"
                        step="1"
                        value={editingStockCount}
                        onChange={(event) =>
                          setEditingStockCount(event.target.value)
                        }
                      />

                      <div className="gallery-card-actions">
                        <button
                          type="button"
                          onClick={() => saveInventoryStock(item.ItemID)}
                        >
                          Save Stock
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingInventoryId(null)
                            setEditingStockCount('')
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p>
                        <strong>Stock Count:</strong> {item.StockCount ?? 0}
                      </p>
                      
                      <div className="gallery-card-actions">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingInventoryId(item.ItemID)
                            setEditingStockCount(String(item.StockCount ?? 0))
                          }}
                        >
                          Edit Stock
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingPriceId(item.ItemID)
                            setEditingPrice(String(item.Price ?? ''))
                            setInventoryError('')
                          }}
                        >
                          Edit Price
                        </button>

                        <button
                          type="button"
                          className="delete-button"
                          onClick={() => removeInventoryItem(item.ItemID)}
                        >
                          Remove from Store
                        </button>
                      </div>

                      {editingPriceId === item.ItemID && (
                        <div className="gallery-field">
                          <label htmlFor={`price-${item.ItemID}`}>Price</label>
                          <input
                            id={`price-${item.ItemID}`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={editingPrice}
                            onChange={(event) => setEditingPrice(event.target.value)}
                          />

                          <div className="gallery-card-actions">
                            <button
                              type="button"
                              onClick={() => saveItemPrice(item.ItemID)}
                            >
                              Save Price
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setEditingPriceId(null)
                                setEditingPrice('')
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}


                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}


export default Stores
