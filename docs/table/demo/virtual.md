# 虚拟滚动

- order: 13

使用 `useVirtual` 开启虚拟滚动，`scrollToRow` 滚动到指定行

:::lang=en-us
# Virtual scroll

- order: 13

Use `useVirtual` to enable virtual scrolling and `scrollToRow` scrolls to the specified column
:::

---

````jsx
import { Table } from '@alifd/next';

const dataSource = (j) => {
  const result = [];
  for (let i = 0; i < j; i++) {
    result.push({
      title: {
        name: `Quotation for 1PCS Nano ${3 + i}.0 controller compatible`,
      },
      id: `100306660940${i}`,
      time: 2000 + i,
      index: i,
    });
  }
  return result;
};
const render = (value, index, record) => {
  return <a>Remove({record.id})</a>;
};
const rowHeightFunc = (_, i) => {
  return i === 0 ? 161 : 41;
};

const expandedRowRender = () => {
  return <div style={{ height: 120 }}>123</div>;
};

class App extends React.Component {
  state = {
    scrollToRow: 20,
    data: dataSource(200),
    openRowKeys: [`100306660940${0}`],
    bodyHeight: 0,
  };
  onBodyScroll = (start) => {
    this.setState({
      scrollToRow: start,
    });
  };

  componentDidMount() {
    setTimeout(() => {
      this.setState({ scrollToRow: 50 });
    }, 3000);
  }
  render() {
    return (
      <Table
        dataSource={this.state.data}
        maxBodyHeight={400}
        useVirtual
        stickyHeader
        scrollToRow={this.state.scrollToRow}
        onBodyScroll={this.onBodyScroll}
        openRowKeys={this.state.openRowKeys}
        expandedRowRender={expandedRowRender}
        rowHeight={rowHeightFunc}
      >
        <Table.Column title="Id1" dataIndex="id" width={100} />
        <Table.Column title="Index" dataIndex="index" width={200} />
        <Table.Column title="Time" dataIndex="time" width={200} />
      </Table>
    );
  }
}

ReactDOM.render(<App/>, mountNode);
````
