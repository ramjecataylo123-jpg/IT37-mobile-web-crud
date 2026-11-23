import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Product {
  id: number;
  title: string;
  price: number;
  description: string;
  category: string;
  image: string;
  rating: {
    rate: number;
    count: number;
  };
}

const API_URL = 'http://192.168.8.35:3000/api/items';

export default function HomeScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Add-item (POST) modal states
  const [addModalVisible, setAddModalVisible] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newPrice, setNewPrice] = useState<string>('');
  const [newCategory, setNewCategory] = useState<string>('');
  const [newDescription, setNewDescription] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Edit-item (PUT) modal states
  const [editingItem, setEditingItem] = useState<Product | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editPrice, setEditPrice] = useState<string>('');
  const [editCategory, setEditCategory] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [updating, setUpdating] = useState<boolean>(false);

  const fetchProducts = useCallback(async (isPullToRefresh = false) => {
    try {
      if (isPullToRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await fetch(API_URL);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status} while fetching API data`);
      }

      const data: Product[] = await response.json();
      setProducts(data);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Unable to reach Node.js backend. Make sure node server.js is running.';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts(false);
  }, [fetchProducts]);

  const handleCreateItem = async () => {
    if (!newTitle.trim() || !newPrice.trim()) {
      Alert.alert('Validation Error', 'Please enter both a title and a price.');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          price: Number(newPrice),
          category: newCategory || 'general',
          description: newDescription,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        Alert.alert('API Error', result.error || 'Failed to add item.');
        return;
      }

      setProducts((prev) => [result, ...prev]);
      setNewTitle('');
      setNewPrice('');
      setNewCategory('');
      setNewDescription('');
      setAddModalVisible(false);
      Alert.alert('Success (201 Created)', `"${result.title}" was saved to the backend!`);
    } catch (err) {
      Alert.alert('Network Error', 'Could not send POST request to the server.');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (item: Product) => {
    setSelectedProduct(null);
    setEditingItem(item);
    setEditTitle(item.title);
    setEditPrice(String(item.price));
    setEditCategory(item.category);
    setEditDescription(item.description);
  };

  const handleUpdateItem = async () => {
    if (!editingItem) return;
    if (!editTitle.trim() || !editPrice.trim()) {
      Alert.alert('Validation Error', 'Title and price are required.');
      return;
    }

    try {
      setUpdating(true);
      const response = await fetch(`${API_URL}/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          price: Number(editPrice),
          category: editCategory || 'general',
          description: editDescription,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        Alert.alert('Update Failed', result.error || 'Could not update item.');
        return;
      }

      setProducts((prev) =>
        prev.map((p) => (p.id === editingItem.id ? result : p))
      );
      setEditingItem(null);
      Alert.alert('Updated (200 OK)', `"${result.title}" is now $${Number(result.price).toFixed(2)}.`);
    } catch (err) {
      Alert.alert('Network Error', 'Could not send PUT request to the server.');
    } finally {
      setUpdating(false);
    }
  };

  const performDelete = async (item: Product) => {
    try {
      setDeletingId(item.id);
      const response = await fetch(`${API_URL}/${item.id}`, {
        method: 'DELETE',
      });

      const text = await response.text();
      let result: { error?: string; message?: string } = {};
      try {
        result = text ? JSON.parse(text) : {};
      } catch {
        result = { error: text || `HTTP ${response.status}` };
      }

      if (!response.ok) {
        Alert.alert('Delete Failed', result.error || `HTTP ${response.status}`);
        return;
      }

      setProducts((prev) => prev.filter((p) => p.id !== item.id));
      if (selectedProduct?.id === item.id) {
        setSelectedProduct(null);
      }
      Alert.alert('Deleted (200 OK)', `"${item.title}" was removed from the backend.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not send DELETE request.';
      Alert.alert('Network Error', msg);
    } finally {
      setDeletingId(null);
    }
  };

  const confirmDeleteItem = (item: Product) => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${item.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => performDelete(item),
        },
      ]
    );
  };

  const categories = useMemo(() => {
    const unique = Array.from(new Set(products.map((item) => item.category)));
    return ['all', ...unique];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      const matchesCategory =
        selectedCategory === 'all' || item.category === selectedCategory;
      const matchesQuery =
        item.title.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.trim().toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [products, selectedCategory, searchQuery]);

  const renderProductCard = ({ item }: { item: Product }) => {
    const isDeleting = deletingId === item.id;
    return (
      <Pressable
        style={styles.card}
        onPress={() => setSelectedProduct(item)}
        android_ripple={{ color: '#e2e8f0' }}
      >
        <Image
          source={{ uri: item.image }}
          style={styles.cardImage}
          resizeMode="cover"
        />
        <View style={styles.cardBody}>
          <Text style={styles.categoryBadge}>{item.category.toUpperCase()}</Text>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.cardFooter}>
            <Text style={styles.priceText}>${item.price.toFixed(2)}</Text>
            <Text style={styles.ratingText}>
              ★ {item.rating.rate} ({item.rating.count})
            </Text>
          </View>
        </View>
        <View style={styles.actionStack}>
          <Pressable
            style={styles.editChip}
            onPress={(e) => {
              e.stopPropagation();
              openEditModal(item);
            }}
          >
            <Text style={styles.editChipText}>Edit</Text>
          </Pressable>
          <Pressable
            style={[styles.deleteChip, isDeleting && { opacity: 0.5 }]}
            onPress={(e) => {
              e.stopPropagation();
              confirmDeleteItem(item);
            }}
            disabled={isDeleting}
          >
            <Text style={styles.deleteChipText}>
              {isDeleting ? '...' : 'Delete'}
            </Text>
          </Pressable>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View>
            <Text style={styles.headerTitle}>IT37 Mobile-Web API</Text>
            <Text style={styles.headerSubtitle}>
              Full CRUD • {filteredProducts.length} of {products.length} items
            </Text>
          </View>
          <Pressable
            style={styles.addButton}
            onPress={() => setAddModalVisible(true)}
          >
            <Text style={styles.addButtonText}>+ Add Item</Text>
          </Pressable>
        </View>

        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search items or categories..."
          placeholderTextColor="#64748b"
          style={styles.searchInput}
          clearButtonMode="while-editing"
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
        >
          {categories.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {cat === 'all' ? 'All Items' : cat}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.stateText}>Fetching data from Node.js API...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Text style={styles.errorTitle}>Backend Connection Failed</Text>
          <Text style={styles.stateText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={() => fetchProducts(false)}>
            <Text style={styles.retryButtonText}>Retry GET Request</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderProductCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchProducts(true)}
            />
          }
          ListEmptyComponent={
            <View style={styles.centerState}>
              <Text style={styles.stateText}>No items found.</Text>
            </View>
          }
        />
      )}

      {/* Detail Modal */}
      <Modal
        visible={selectedProduct !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedProduct(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {selectedProduct && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Image
                  source={{ uri: selectedProduct.image }}
                  style={styles.modalImage}
                  resizeMode="cover"
                />
                <Text style={styles.categoryBadge}>
                  {selectedProduct.category.toUpperCase()}
                </Text>
                <Text style={styles.modalTitle}>{selectedProduct.title}</Text>
                <View style={styles.modalMetaRow}>
                  <Text style={styles.modalPrice}>
                    ${selectedProduct.price.toFixed(2)}
                  </Text>
                  <Text style={styles.ratingText}>
                    ★ {selectedProduct.rating.rate} ({selectedProduct.rating.count} reviews)
                  </Text>
                </View>
                <Text style={styles.modalDescription}>
                  {selectedProduct.description}
                </Text>
                <Pressable
                  style={styles.modalEditButton}
                  onPress={() => openEditModal(selectedProduct)}
                >
                  <Text style={styles.submitButtonText}>Edit Item (PUT)</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalDeleteButton, { marginTop: 10 }]}
                  onPress={() => confirmDeleteItem(selectedProduct)}
                >
                  <Text style={styles.submitButtonText}>Delete Item (DELETE)</Text>
                </Pressable>
                <Pressable
                  style={[styles.closeButton, { marginTop: 10 }]}
                  onPress={() => setSelectedProduct(null)}
                >
                  <Text style={styles.closeButtonText}>Close Details</Text>
                </Pressable>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Edit Item (PUT) Modal */}
      <Modal
        visible={editingItem !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditingItem(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Edit Item (PUT /api/items/:id)</Text>

              <Text style={styles.inputLabel}>Item Title *</Text>
              <TextInput
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="Item title"
                placeholderTextColor="#94a3b8"
                style={styles.formInput}
              />

              <Text style={styles.inputLabel}>Price (USD) *</Text>
              <TextInput
                value={editPrice}
                onChangeText={setEditPrice}
                placeholder="e.g., 59.99"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                style={styles.formInput}
              />

              <Text style={styles.inputLabel}>Category</Text>
              <TextInput
                value={editCategory}
                onChangeText={setEditCategory}
                placeholder="e.g., electronics"
                placeholderTextColor="#94a3b8"
                style={styles.formInput}
              />

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                value={editDescription}
                onChangeText={setEditDescription}
                placeholder="Item description..."
                placeholderTextColor="#94a3b8"
                multiline
                style={[styles.formInput, { height: 75, textAlignVertical: 'top' }]}
              />

              <Pressable
                style={[styles.submitButton, updating && { opacity: 0.6 }]}
                onPress={handleUpdateItem}
                disabled={updating}
              >
                <Text style={styles.submitButtonText}>
                  {updating ? 'Sending PUT...' : 'Save Changes'}
                </Text>
              </Pressable>

              <Pressable
                style={[styles.closeButton, { marginTop: 10 }]}
                onPress={() => setEditingItem(null)}
              >
                <Text style={styles.closeButtonText}>Cancel</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Item (POST) Modal */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Add New Item (POST /api/items)</Text>

              <Text style={styles.inputLabel}>Item Title *</Text>
              <TextInput
                value={newTitle}
                onChangeText={setNewTitle}
                placeholder="e.g., Gaming Headset"
                placeholderTextColor="#94a3b8"
                style={styles.formInput}
              />

              <Text style={styles.inputLabel}>Price (USD) *</Text>
              <TextInput
                value={newPrice}
                onChangeText={setNewPrice}
                placeholder="e.g., 39.99"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                style={styles.formInput}
              />

              <Text style={styles.inputLabel}>Category</Text>
              <TextInput
                value={newCategory}
                onChangeText={setNewCategory}
                placeholder="e.g., electronics"
                placeholderTextColor="#94a3b8"
                style={styles.formInput}
              />

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                value={newDescription}
                onChangeText={setNewDescription}
                placeholder="Short item description..."
                placeholderTextColor="#94a3b8"
                multiline
                style={[styles.formInput, { height: 75, textAlignVertical: 'top' }]}
              />

              <Pressable
                style={[styles.submitButton, submitting && { opacity: 0.6 }]}
                onPress={handleCreateItem}
                disabled={submitting}
              >
                <Text style={styles.submitButtonText}>
                  {submitting ? 'Sending POST...' : 'Submit to API'}
                </Text>
              </Pressable>

              <Pressable
                style={[styles.closeButton, { marginTop: 10 }]}
                onPress={() => setAddModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>Cancel</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingTop: 14,
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  addButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  searchInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 10,
  },
  categoryRow: {
    gap: 8,
    paddingBottom: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
  },
  chipActive: {
    backgroundColor: '#2563eb',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    textTransform: 'capitalize',
  },
  chipTextActive: {
    color: '#ffffff',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    gap: 10,
  },
  cardImage: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
  },
  cardBody: {
    flex: 1,
  },
  categoryBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563eb',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    lineHeight: 19,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  priceText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#059669',
  },
  ratingText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  actionStack: {
    gap: 6,
  },
  editChip: {
    backgroundColor: '#dbeafe',
    borderWidth: 1,
    borderColor: '#93c5fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  editChipText: {
    color: '#1d4ed8',
    fontWeight: '700',
    fontSize: 12,
  },
  deleteChip: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteChipText: {
    color: '#dc2626',
    fontWeight: '700',
    fontSize: 12,
  },
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#dc2626',
    marginBottom: 6,
  },
  stateText: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    marginTop: 8,
  },
  retryButton: {
    marginTop: 14,
    backgroundColor: '#2563eb',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '88%',
  },
  modalImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  modalMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#059669',
  },
  modalDescription: {
    fontSize: 14,
    lineHeight: 21,
    color: '#334155',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
  },
  formInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 12,
  },
  submitButton: {
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  submitButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  modalEditButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalDeleteButton: {
    backgroundColor: '#dc2626',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeButton: {
    backgroundColor: '#0f172a',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },
});