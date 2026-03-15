/**
 * Global mock for React Native's FlatList.
 * This ensures FlatList renders its items synchronously in test environments,
 * which avoids virtualization issues where items are not rendered in the DOM.
 */
const React = require('react');

function MockFlatList({ data, renderItem, ListHeaderComponent, ListEmptyComponent, keyExtractor }) {
  const header = ListHeaderComponent
    ? (typeof ListHeaderComponent === 'function'
        ? React.createElement(ListHeaderComponent)
        : ListHeaderComponent)
    : null;

  const items = data && data.length > 0
    ? data.map((item, index) => renderItem
        ? React.cloneElement(renderItem({ item, index: index, separators: {} }), {
            key: keyExtractor ? keyExtractor(item, index) : String(index),
          })
        : null)
    : (ListEmptyComponent
        ? (typeof ListEmptyComponent === 'function'
            ? React.createElement(ListEmptyComponent)
            : ListEmptyComponent)
        : null);

  const { View } = require('react-native');
  return React.createElement(View, null, header, items);
}

module.exports = MockFlatList;
