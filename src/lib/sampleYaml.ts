export const SAMPLE_YAML = `version: "1.0"
description: "ECサイト向け サンプルDBスキーマ"

tables:
  - table: users
    comment: "ユーザーマスター"
    columns:
      - name: id
        type: uuid
        primaryKey: true
        default: gen_random_uuid()
        comment: "ユーザーID"
      - name: email
        type: varchar
        length: 255
        unique: true
        comment: "メールアドレス"
      - name: name
        type: varchar
        length: 100
        comment: "表示名"
      - name: created_at
        type: timestamptz
        default: now()
        comment: "作成日時"
      - name: updated_at
        type: timestamptz
        default: now()
        comment: "更新日時"

  - table: products
    comment: "商品マスター"
    columns:
      - name: id
        type: uuid
        primaryKey: true
        default: gen_random_uuid()
        comment: "商品ID"
      - name: name
        type: varchar
        length: 200
        comment: "商品名"
      - name: description
        type: text
        nullable: true
        comment: "商品説明"
      - name: price
        type: integer
        comment: "価格(円)"
      - name: stock
        type: integer
        default: "0"
        comment: "在庫数"
      - name: created_at
        type: timestamptz
        default: now()
        comment: "作成日時"
    indexes:
      - name: idx_products_name
        columns: [name]
      - name: idx_products_price
        columns: [price]

  - table: orders
    comment: "注文履歴"
    columns:
      - name: id
        type: uuid
        primaryKey: true
        default: gen_random_uuid()
        comment: "注文ID"
      - name: user_id
        type: uuid
        foreignKey:
          table: users
          column: id
          onDelete: CASCADE
        comment: "注文ユーザー"
      - name: total
        type: integer
        comment: "合計金額(円)"
      - name: status
        type: varchar
        length: 20
        default: "'pending'"
        comment: "注文ステータス"
      - name: created_at
        type: timestamptz
        default: now()
        comment: "注文日時"
    indexes:
      - name: idx_orders_user_id
        columns: [user_id]
      - name: idx_orders_status
        columns: [status]

  - table: order_items
    comment: "注文明細"
    columns:
      - name: id
        type: uuid
        primaryKey: true
        default: gen_random_uuid()
        comment: "明細ID"
      - name: order_id
        type: uuid
        foreignKey:
          table: orders
          column: id
          onDelete: CASCADE
        comment: "親注文"
      - name: product_id
        type: uuid
        foreignKey:
          table: products
          column: id
          onDelete: RESTRICT
        comment: "商品"
      - name: quantity
        type: integer
        comment: "数量"
      - name: unit_price
        type: integer
        comment: "単価(円)"
    indexes:
      - name: idx_order_items_order_id
        columns: [order_id]
      - name: idx_order_items_product_id
        columns: [product_id]
`;
